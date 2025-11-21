import prisma from "../config/database";
import { EstadoPago, EstadoReserva } from "@prisma/client";

export type SolicitudReservaDTO = {
  id_reserva: number;
  nombre_local: string;
  numero_mesa: number;
  nombre_cliente: string;
  fecha_reserva: Date;
  hora_inicio: Date;
  duracion_horas: number;
  monto_pagado: number;
  estado_reserva: EstadoReserva;
  comprobante_url: string | null;
};

function calcularDuracionHoras(horaInicio: Date, horaFin: Date): number {
  const diffMs = horaFin.getTime() - horaInicio.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

export async function listarSolicitudesReservaPropietario(
  idUsuarioPropietario: number
): Promise<SolicitudReservaDTO[]> {
  const reservas = await prisma.reserva.findMany({
    where: {
      mesa: {
        local: {
          id_usuario_admin: idUsuarioPropietario,
        },
      },
      estado_reserva: {
        in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA],
      },
      pago: {
        is: {
          estado_pago: {
            in: [EstadoPago.PENDIENTE, EstadoPago.APROBADO],
          },
        },
      },
    },
    include: {
      usuario: true,
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
      { id_reserva: "asc" },
    ],
  });

  return reservas.map((r) => {
    if (!r.mesa || !r.mesa.local || !r.pago) {
      throw new Error("RESERVA_INCONSISTENTE");
    }

    const cliente = r.usuario;
    const mesa = r.mesa;
    const local = mesa.local;
    const pago = r.pago;

    const duracion_horas = calcularDuracionHoras(r.hora_inicio, r.hora_fin);
    const monto_pagado = Number(pago.monto);

    const nombre_cliente = `${cliente.primer_apellido}${
      cliente.segundo_apellido ? " " + cliente.segundo_apellido : ""
    } ${cliente.nombre}`;

    return {
      id_reserva: r.id_reserva,
      nombre_local: local.nombre,
      numero_mesa: mesa.numero_mesa,
      nombre_cliente,
      fecha_reserva: r.fecha_reserva,
      hora_inicio: r.hora_inicio,
      duracion_horas,
      monto_pagado,
      estado_reserva: r.estado_reserva,
      comprobante_url: pago.comprobante_url ?? null,
    };
  });
}

export async function aceptarSolicitudReservaService(
  id_reserva: number,
  idUsuarioPropietario: number
) {
  return await prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findUnique({
      where: { id_reserva },
      include: {
        mesa: {
          include: {
            local: true,
          },
        },
        pago: true,
      },
    });

    if (!reserva) {
      throw new Error("RESERVA_NO_ENCONTRADA");
    }

    if (!reserva.mesa || !reserva.mesa.local) {
      throw new Error("RESERVA_INCONSISTENTE");
    }

    if (reserva.mesa.local.id_usuario_admin !== idUsuarioPropietario) {
      throw new Error("RESERVA_NO_PERTENECE_LOCAL");
    }

    if (!reserva.pago) {
      throw new Error("PAGO_NO_REGISTRADO");
    }

    if (reserva.pago.estado_pago === EstadoPago.APROBADO) {
      throw new Error("PAGO_YA_APROBADO");
    }

    if (reserva.pago.estado_pago === EstadoPago.RECHAZADO) {
      throw new Error("PAGO_YA_RECHAZADO");
    }

    if (
      reserva.estado_reserva !== EstadoReserva.PENDIENTE &&
      reserva.estado_reserva !== EstadoReserva.CONFIRMADA
    ) {
      throw new Error("RESERVA_NO_VIGENTE");
    }

    const reservaActualizada = await tx.reserva.update({
      where: { id_reserva: reserva.id_reserva },
      data: {
        estado_reserva: EstadoReserva.CONFIRMADA,
      },
    });

    const pagoActualizado = await tx.pago.update({
      where: { id_pago: reserva.pago.id_pago },
      data: {
        estado_pago: EstadoPago.APROBADO,
        fecha_confirmacion: new Date(),
      },
    });

    return {
      id_reserva: reservaActualizada.id_reserva,
      estado_reserva: reservaActualizada.estado_reserva,
      estado_pago: pagoActualizado.estado_pago,
    };
  });
}

export async function rechazarSolicitudReservaService(
  id_reserva: number,
  idUsuarioPropietario: number
) {
  return await prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findUnique({
      where: { id_reserva },
      include: {
        mesa: {
          include: {
            local: true,
          },
        },
        pago: true,
      },
    });

    if (!reserva) {
      throw new Error("RESERVA_NO_ENCONTRADA");
    }

    if (!reserva.mesa || !reserva.mesa.local) {
      throw new Error("RESERVA_INCONSISTENTE");
    }

    if (reserva.mesa.local.id_usuario_admin !== idUsuarioPropietario) {
      throw new Error("RESERVA_NO_PERTENECE_LOCAL");
    }

    if (!reserva.pago) {
      throw new Error("PAGO_NO_REGISTRADO");
    }

    if (reserva.pago.estado_pago === EstadoPago.RECHAZADO) {
      throw new Error("PAGO_YA_RECHAZADO");
    }

    if (reserva.pago.estado_pago === EstadoPago.APROBADO) {
      throw new Error("PAGO_YA_APROBADO");
    }

    if (
      reserva.estado_reserva === EstadoReserva.CANCELADA ||
      reserva.estado_reserva === EstadoReserva.FINALIZADA
    ) {
      throw new Error("RESERVA_NO_VIGENTE");
    }

    const reservaActualizada = await tx.reserva.update({
      where: { id_reserva: reserva.id_reserva },
      data: {
        estado_reserva: EstadoReserva.FINALIZADA,
      },
    });

    const pagoActualizado = await tx.pago.update({
      where: { id_pago: reserva.pago.id_pago },
      data: {
        estado_pago: EstadoPago.RECHAZADO,
        fecha_confirmacion: new Date(),
      },
    });

    return {
      id_reserva: reservaActualizada.id_reserva,
      estado_reserva: reservaActualizada.estado_reserva,
      estado_pago: pagoActualizado.estado_pago,
    };
  });
}
