// src/services/reservasCliente.service.ts
import { PrismaClient, EstadoReserva, TipoMesa, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface ReservaClienteDTO {
  id_reserva: number;
  id_mesa: number;
  nombre_local: string;
  numero_mesa: number;
  tipo_mesa: TipoMesa;

  // Valores TAL CUAL BD, pero enviados como strings para evitar problema de timezone
  fecha_reserva: string; // "YYYY-MM-DD"
  hora_inicio: string;   // "HH:mm"
  hora_fin: string;      // "HH:mm"

  duracion_horas: number; // derivado de hora_fin - hora_inicio (mismo registro)

  monto_pagado: number;             // Pago.monto o reserva.monto_estimado
  estado_reserva: EstadoReserva;
  penalizacion_sugerida: number;    // calculado
  monto_devolucion_sugerida: number; // calculado
  celular_admin: string | null;
}

// Helpers de formato seguros (usan UTC, no la zona local)
function fechaToISODateString(d: Date): string {
  // 2025-12-04T00:00:00.000Z -> "2025-12-04"
  return d.toISOString().slice(0, 10);
}
function timeToHHMM(d: Date): string {
  // 1970-01-01T16:00:00.000Z -> "16:00"
  return d.toISOString().slice(11, 16);
}

// Construye un Date UTC a partir de "YYYY-MM-DD" y "HH:mm"
function combinarFechaYHoraUTC(fechaISO: string, horaHHMM: string): Date {
  // "2025-12-04", "16:00" -> Date("2025-12-04T16:00:00.000Z")
  return new Date(`${fechaISO}T${horaHHMM}:00.000Z`);
}

function calcularPenalizacionSugerida(
  fecha_reserva_iso: string,
  hora_inicio_hhmm: string,
  hora_fin_hhmm: string
): number {
  const ahora = new Date();

  const inicio = combinarFechaYHoraUTC(fecha_reserva_iso, hora_inicio_hhmm);
  const fin = combinarFechaYHoraUTC(fecha_reserva_iso, hora_fin_hhmm);

  // Dentro de la reserva o ya pasada -> 40%
  if (ahora >= inicio && ahora <= fin) return 40;
  if (ahora >= fin) return 40;

  // Antes de iniciar: penalización según minutos restantes
  const diffMin = (inicio.getTime() - ahora.getTime()) / (1000 * 60);

  if (diffMin < 15) return 30;
  if (diffMin < 30) return 20;
  if (diffMin < 60) return 10;
  return 0;
}

/**
 * Lista única de reservas del cliente:
 * - Solo estados PENDIENTE y CONFIRMADA
 * - Auto-finaliza si ya pasaron 5 minutos después de hora_fin (sobre la MISMA reserva)
 * - Ordenado por fecha_reserva y hora_inicio ascendente
 */
export async function listarMisReservasCliente(
  idUsuario: number
): Promise<ReservaClienteDTO[]> {
  const ahora = new Date();

  const reservas = await prisma.reserva.findMany({
    where: {
      id_usuario: idUsuario,
      estado_reserva: {
        in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA],
      },
    },
    include: {
      mesa: {
        include: {
          local: {
            include: {
              admin: true, // para celular del dueño
            },
          },
        },
      },
      pago: true,
    },
    orderBy: [{ fecha_reserva: "asc" }, { hora_inicio: "asc" }],
  });

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const resultado: ReservaClienteDTO[] = [];

  for (const r of reservas) {
    // === FECHA / HORA TAL CUAL BD (formateadas seguras) ===
    const fechaISO = fechaToISODateString(r.fecha_reserva); // "2025-12-04"
    const horaInicioHHMM = timeToHHMM(r.hora_inicio);        // "16:00"
    const horaFinHHMM = timeToHHMM(r.hora_fin);              // "18:00"

    // === Cálculo de estado FINALIZADA según hora_fin de ESA reserva ===
    const finCompleto = combinarFechaYHoraUTC(fechaISO, horaFinHHMM);
    const limiteFin = new Date(finCompleto.getTime() + 5 * 60 * 1000); // +5 minutos

    let estadoCalculado = r.estado_reserva;
    if (ahora >= limiteFin) {
      estadoCalculado = EstadoReserva.FINALIZADA;
    }

    if (
      estadoCalculado === EstadoReserva.FINALIZADA &&
      r.estado_reserva !== EstadoReserva.FINALIZADA
    ) {
      updates.push(
        prisma.reserva.update({
          where: { id_reserva: r.id_reserva },
          data: { estado_reserva: EstadoReserva.FINALIZADA },
        })
      );
      // FINALIZADAS ya no se devuelven en "mis reservas"
      continue;
    }

    // Solo devolvemos PENDIENTE y CONFIRMADA
    if (
      estadoCalculado !== EstadoReserva.PENDIENTE &&
      estadoCalculado !== EstadoReserva.CONFIRMADA
    ) {
      continue;
    }

    // === Duración en horas usando hora_inicio y hora_fin de ESA reserva ===
    const duracionMs = r.hora_fin.getTime() - r.hora_inicio.getTime();
    const duracionHoras = duracionMs / (1000 * 60 * 60);

    // === Penalización sugerida (solo cálculo) ===
    const penalizacion_sugerida = calcularPenalizacionSugerida(
      fechaISO,
      horaInicioHHMM,
      horaFinHHMM
    );

    // === Monto pagado: SIEMPRE desde la BD (Pago.monto o monto_estimado) ===
    const monto_pagado = r.pago
      ? Number(r.pago.monto) // monto real cobrado
      : Number(r.monto_estimado ?? 0); // estimado que ya se guardó en tabla Reserva

    const factor = 1 - penalizacion_sugerida / 100;
    const monto_devolucion_sugerida = Number(
      Math.max(0, monto_pagado * factor).toFixed(2)
    );

    const celular_admin = r.mesa.local.admin?.celular ?? null;

    resultado.push({
      id_reserva: r.id_reserva,
      id_mesa: r.mesa.id_mesa,
      nombre_local: r.mesa.local.nombre,
      numero_mesa: r.mesa.numero_mesa,
      tipo_mesa: r.mesa.tipo_mesa,

      fecha_reserva: fechaISO,      // <- viene directo de la BD
      hora_inicio: horaInicioHHMM,  // <- directo de BD, sin desfase
      hora_fin: horaFinHHMM,        // <- directo de BD, sin desfase

      duracion_horas: duracionHoras,

      monto_pagado,
      estado_reserva: estadoCalculado,
      penalizacion_sugerida,
      monto_devolucion_sugerida,
      celular_admin,
    });
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return resultado;
}
