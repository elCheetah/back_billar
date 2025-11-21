// src/services/solicitudesReserva.service.ts
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

/**
 * Lista TODAS las reservas (PENDIENTE o CONFIRMADA)
 * que pertenecen a mesas de locales administrados por el propietario logueado.
 * No filtra por estado del pago (si no hay pago, monto = 0 y comprobante = null).
 */
export async function listarSolicitudesReservaPropietario(
  idUsuarioPropietario: number
): Promise<SolicitudReservaDTO[]> {
  const ownerId = Number(idUsuarioPropietario);
  if (!Number.isFinite(ownerId)) return [];

  const reservas = await prisma.reserva.findMany({
    where: {
      estado_reserva: {
        in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA],
      },
      mesa: {
        local: {
          id_usuario_admin: ownerId,
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
    if (!r.mesa || !r.mesa.local) {
      throw new Error("RESERVA_INCONSISTENTE");
    }

    const cliente = r.usuario;
    const mesa = r.mesa;
    const local = mesa.local;
    const pago = r.pago || null;

    const duracion_horas = calcularDuracionHoras(r.hora_inicio, r.hora_fin);
    const monto_pagado = pago ? Number(pago.monto) : 0;

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
      comprobante_url: pago?.comprobante_url ?? null,
    };
  });
}



/**
 * Aceptar solicitud:
 * - Busca la reserva usando SOLO:
 *    - id_reserva
 *    - que la mesa pertenezca a un local cuyo id_usuario_admin = usuario logeado
 * - Cambia reserva a CONFIRMADA
 * - Cambia pago a APROBADO (si existe)
 */
export async function aceptarSolicitudReservaService(
  id_reserva: number,
  idUsuarioPropietario: number
) {
  return await prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findFirst({
      where: {
        id_reserva,
        mesa: {
          local: {
            id_usuario_admin: idUsuarioPropietario,
          },
        },
      },
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
      throw new Error(
        "RESERVA_NO_ENCONTRADA: La reserva no existe o no pertenece a tu local."
      );
    }

    if (!reserva.pago) {
      throw new Error(
        "PAGO_NO_REGISTRADO: No se encontró un pago asociado a esta reserva."
      );
    }

    if (reserva.pago.estado_pago === EstadoPago.APROBADO) {
      throw new Error("PAGO_YA_APROBADO: Esta reserva ya fue aceptada.");
    }

    if (reserva.pago.estado_pago === EstadoPago.RECHAZADO) {
      throw new Error("PAGO_YA_RECHAZADO: Esta reserva ya fue rechazada.");
    }

    if (
      reserva.estado_reserva !== EstadoReserva.PENDIENTE &&
      reserva.estado_reserva !== EstadoReserva.CONFIRMADA
    ) {
      throw new Error(
        "RESERVA_NO_VIGENTE: Solo se pueden aceptar reservas pendientes o confirmadas."
      );
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

/**
 * Rechazar solicitud:
 * - Igual: se valida solo por id_reserva + propietario del local.
 * - Cambia reserva a FINALIZADA
 * - Cambia pago a RECHAZADO
 */
export async function rechazarSolicitudReservaService(
  id_reserva: number,
  idUsuarioPropietario: number
) {
  return await prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findFirst({
      where: {
        id_reserva,
        mesa: {
          local: {
            id_usuario_admin: idUsuarioPropietario,
          },
        },
      },
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
      throw new Error(
        "RESERVA_NO_ENCONTRADA: La reserva no existe o no pertenece a tu local."
      );
    }

    if (!reserva.pago) {
      throw new Error(
        "PAGO_NO_REGISTRADO: No se encontró un pago asociado a esta reserva."
      );
    }

    if (reserva.pago.estado_pago === EstadoPago.RECHAZADO) {
      throw new Error("PAGO_YA_RECHAZADO: Esta reserva ya fue rechazada.");
    }

    if (reserva.pago.estado_pago === EstadoPago.APROBADO) {
      throw new Error(
        "PAGO_YA_APROBADO: No se puede rechazar un pago ya aprobado."
      );
    }

    if (
      reserva.estado_reserva === EstadoReserva.CANCELADA ||
      reserva.estado_reserva === EstadoReserva.FINALIZADA ||
      reserva.estado_reserva === EstadoReserva.RECHAZADA
    ) {
      throw new Error(
        "RESERVA_NO_VIGENTE: Solo se pueden rechazar reservas que aún están activas."
      );
    }

    const reservaActualizada = await tx.reserva.update({
      where: { id_reserva: reserva.id_reserva },
      data: {
        estado_reserva: EstadoReserva.RECHAZADA,
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

