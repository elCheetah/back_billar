// src/services/reservasCliente.service.ts
import { PrismaClient, EstadoReserva, TipoMesa, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface ReservaClienteDTO {
  id_reserva: number;
  id_mesa: number;
  nombre_local: string;
  numero_mesa: number;
  tipo_mesa: TipoMesa;
  monto_pagado: number;
  fecha_reserva: Date;
  hora_inicio: Date;
  duracion_horas: number;
  estado_reserva: EstadoReserva;
  penalizacion_sugerida: number;
  monto_devolucion_sugerida: number;
  celular_admin: string | null;
}

function combinarFechaYHora(fecha: Date, hora: Date): Date {
  const f = new Date(fecha);
  f.setHours(hora.getHours(), hora.getMinutes(), hora.getSeconds(), 0);
  return f;
}

function calcularPenalizacionSugerida(
  fecha_reserva: Date,
  hora_inicio: Date,
  hora_fin: Date
): number {
  const ahora = new Date();
  const inicio = combinarFechaYHora(fecha_reserva, hora_inicio);
  const fin = combinarFechaYHora(fecha_reserva, hora_fin);

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
 * - Auto-finaliza si ya pasaron 5 minutos después de hora_fin
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
    const finCompleto = combinarFechaYHora(r.fecha_reserva, r.hora_fin);
    const limiteFin = new Date(finCompleto.getTime() + 5 * 60 * 1000); // +5 minutos

    let estadoCalculado = r.estado_reserva;

    // Si ya pasó 5 min después de la hora fin -> FINALIZADA
    if (ahora >= limiteFin) {
      estadoCalculado = EstadoReserva.FINALIZADA;
    }

    // Si pasó a FINALIZADA y en BD aún no está, se actualiza en segundo plano
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
      // Ya no se devuelve al cliente
      continue;
    }

    // Solo devolvemos PENDIENTE y CONFIRMADA
    if (
      estadoCalculado !== EstadoReserva.PENDIENTE &&
      estadoCalculado !== EstadoReserva.CONFIRMADA
    ) {
      continue;
    }

    const duracionMs = r.hora_fin.getTime() - r.hora_inicio.getTime();
    const duracionHoras = duracionMs / (1000 * 60 * 60);

    const penalizacion_sugerida = calcularPenalizacionSugerida(
      r.fecha_reserva,
      r.hora_inicio,
      r.hora_fin
    );

    const monto_pagado = r.pago
      ? Number(r.pago.monto)
      : Number(r.monto_estimado ?? 0);

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
      monto_pagado,
      fecha_reserva: r.fecha_reserva,
      hora_inicio: r.hora_inicio,
      duracion_horas: duracionHoras,
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
