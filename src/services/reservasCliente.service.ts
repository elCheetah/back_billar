import { PrismaClient, EstadoReserva } from "@prisma/client";

const prisma = new PrismaClient();

export interface ReservaClienteDTO {
  id_reserva: number;
  nombre_local: string;
  numero_mesa: number;
  monto_pagado: number;
  fecha_reserva: Date;
  hora_inicio: Date;
  duracion_horas: number;
  estado_reserva: EstadoReserva;
  penalizacion_sugerida: number;
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

  if (ahora >= inicio && ahora <= fin) return 40;
  if (ahora >= fin) return 40;

  const diffMin = (inicio.getTime() - ahora.getTime()) / (1000 * 60);

  if (diffMin < 15) return 30;
  if (diffMin < 30) return 20;
  if (diffMin < 60) return 10;
  return 0;
}

export async function listarReservasClientePorEstado(
  idUsuario: number,
  estado: EstadoReserva
): Promise<ReservaClienteDTO[]> {
  const reservas = await prisma.reserva.findMany({
    where: {
      id_usuario: idUsuario,
      estado_reserva: estado,
    },
    include: {
      mesa: {
        include: {
          local: true,
        },
      },
      pago: true,
    },
    orderBy: [
      { fecha_reserva: "asc" },
      { hora_inicio: "asc" },
    ],
  });

  return reservas.map((r) => {
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

    return {
      id_reserva: r.id_reserva,
      nombre_local: r.mesa.local.nombre,
      numero_mesa: r.mesa.numero_mesa,
      monto_pagado,
      fecha_reserva: r.fecha_reserva,
      hora_inicio: r.hora_inicio,
      duracion_horas: duracionHoras,
      estado_reserva: r.estado_reserva,
      penalizacion_sugerida,
    };
  });
}
