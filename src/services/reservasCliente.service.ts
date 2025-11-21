// src/services/reservasCliente.service.ts
import prisma from "../config/database";
import { EstadoReserva, TipoMesa } from "@prisma/client";

export interface ReservaClienteDTO {
  id_reserva: number;
  id_mesa: number;
  nombre_local: string;
  numero_mesa: number;
  tipo_mesa: TipoMesa;

  // Valores TAL CUAL BD, enviados como strings para evitar timezone issues
  fecha_reserva: string; // "YYYY-MM-DD"
  hora_inicio: string; // "HH:mm"
  hora_fin: string; // "HH:mm"

  duracion_horas: number; // derivado de hora_fin - hora_inicio (mismo registro)

  monto_pagado: number; // Pago.monto o reserva.monto_estimado
  estado_reserva: EstadoReserva;

  penalizacion_sugerida: number; // calculado
  monto_devolucion_sugerida: number; // calculado

  celular_admin: string | null;
}

/** Helpers “tal cual BD” usando getters UTC (evita desfases) */
function fechaToISODateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeToHHMM(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * “Ahora” en Bolivia (America/La_Paz), pero representado como Date en UTC
 * (pseudo-UTC: contiene la hora boliviana en los campos YYYY-MM-DD HH:mm:ss)
 * Esto permite comparar con Date("YYYY-MM-DDTHH:mm:00Z") sin depender del TZ del servidor.
 */
function getNowBoliviaPseudoUTC(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  const iso = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}.000Z`;
  return new Date(iso);
}

/** Construye un Date pseudo-UTC a partir de "YYYY-MM-DD" + "HH:mm" */
function combinarFechaYHoraPseudoUTC(fechaISO: string, horaHHMM: string): Date {
  return new Date(`${fechaISO}T${horaHHMM}:00.000Z`);
}

function calcularPenalizacionSugerida(
  fecha_reserva_iso: string,
  hora_inicio_hhmm: string,
  hora_fin_hhmm: string,
  ahoraBoliviaPseudoUTC: Date
): number {
  const inicio = combinarFechaYHoraPseudoUTC(fecha_reserva_iso, hora_inicio_hhmm);
  const fin = combinarFechaYHoraPseudoUTC(fecha_reserva_iso, hora_fin_hhmm);

  // Si por alguna razón fin < inicio (cruza medianoche), ajusta +24h a fin
  let finAjustado = fin;
  if (finAjustado.getTime() < inicio.getTime()) {
    finAjustado = new Date(finAjustado.getTime() + 24 * 60 * 60 * 1000);
  }

  // Dentro de la reserva o ya pasada -> 40%
  if (ahoraBoliviaPseudoUTC >= inicio && ahoraBoliviaPseudoUTC <= finAjustado) return 40;
  if (ahoraBoliviaPseudoUTC >= finAjustado) return 40;

  // Antes de iniciar: penalización según minutos restantes
  const diffMin = (inicio.getTime() - ahoraBoliviaPseudoUTC.getTime()) / (1000 * 60);

  if (diffMin < 15) return 30;
  if (diffMin < 30) return 20;
  if (diffMin < 60) return 10;
  return 0;
}

/**
 * Lista única de reservas del cliente:
 * - Solo estados PENDIENTE y CONFIRMADA
 * - NO auto-finaliza, NO actualiza, NO hace transacciones (solo lectura)
 * - Ordenado por fecha_reserva y hora_inicio ascendente
 */
export async function listarMisReservasCliente(
  idUsuario: number
): Promise<ReservaClienteDTO[]> {
  const ahoraBoliviaPseudoUTC = getNowBoliviaPseudoUTC();

  const reservas = await prisma.reserva.findMany({
    where: {
      id_usuario: idUsuario, // debe coincidir con usuario logueado
      estado_reserva: {
        in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA],
      },
    },
    include: {
      mesa: {
        include: {
          local: {
            include: {
              admin: true, // celular del dueño
            },
          },
        },
      },
      pago: true,
    },
    orderBy: [{ fecha_reserva: "asc" }, { hora_inicio: "asc" }],
  });

  const resultado: ReservaClienteDTO[] = reservas.map((r) => {
    const fechaISO = fechaToISODateString(r.fecha_reserva);
    const horaInicioHHMM = timeToHHMM(r.hora_inicio);
    const horaFinHHMM = timeToHHMM(r.hora_fin);

    // Duración (si cruza medianoche, ajusta +24h)
    let duracionMs = r.hora_fin.getTime() - r.hora_inicio.getTime();
    if (duracionMs < 0) duracionMs += 24 * 60 * 60 * 1000;
    const duracionHoras = duracionMs / (1000 * 60 * 60);

    const penalizacion_sugerida = calcularPenalizacionSugerida(
      fechaISO,
      horaInicioHHMM,
      horaFinHHMM,
      ahoraBoliviaPseudoUTC
    );

    // Monto pagado real (BD) o estimado (BD)
    const monto_pagado = r.pago ? Number(r.pago.monto) : Number(r.monto_estimado ?? 0);

    const factor = 1 - penalizacion_sugerida / 100;
    const monto_devolucion_sugerida = Number(Math.max(0, monto_pagado * factor).toFixed(2));

    const celular_admin = r.mesa?.local?.admin?.celular ?? null;

    return {
      id_reserva: r.id_reserva,
      id_mesa: r.mesa.id_mesa,
      nombre_local: r.mesa.local.nombre,
      numero_mesa: r.mesa.numero_mesa,
      tipo_mesa: r.mesa.tipo_mesa,

      fecha_reserva: fechaISO,
      hora_inicio: horaInicioHHMM,
      hora_fin: horaFinHHMM,

      duracion_horas: duracionHoras,

      monto_pagado,
      estado_reserva: r.estado_reserva, // NO se recalcula, NO se modifica

      penalizacion_sugerida,
      monto_devolucion_sugerida,
      celular_admin,
    };
  });

  return resultado;
}
