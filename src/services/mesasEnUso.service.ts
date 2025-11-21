// src/services/mesasEnUso.service.ts
import prisma from "../config/database";
import {
  EstadoReserva,
  EstadoMesa,
} from "@prisma/client";

export type MesaEnUsoDTO = {
  id_reserva: number;
  id_mesa: number;
  nombre_local: string;
  numero_mesa: number;
  nombre_cliente: string;
  fecha_reserva: Date;
  hora_inicio: Date;
  duracion_horas: number;
  monto_pagado: number;
  estado_reserva: EstadoReserva;
};

function calcularDuracionHoras(horaInicio: Date, horaFin: Date): number {
  const diffMs = horaFin.getTime() - horaInicio.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

/**
 * Lista las mesas en uso (OCUPADO) del local del propietario autenticado,
 * SOLO para reservas de HOY, con estado PENDIENTE o CONFIRMADA.
 */
export async function listarMesasEnUsoPropietario(
  idUsuarioPropietario: number
): Promise<MesaEnUsoDTO[]> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const reservas = await prisma.reserva.findMany({
    where: {
      fecha_reserva: hoy,
      estado_reserva: {
        in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA],
      },
      mesa: {
        estado: EstadoMesa.OCUPADO,
        local: {
          id_usuario_admin: idUsuarioPropietario,
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
      pago: {
        select: {
          monto: true,
          estado_pago: true,
        },
      },
    },
    orderBy: [
      { hora_inicio: "asc" },
      { id_reserva: "asc" },
    ],
  });

  return reservas.map((r) => {
    if (!r.mesa || !r.mesa.local) {
      throw new Error("RESERVA_INCONSISTENTE: Falta relación de mesa/local.");
    }

    const cliente = r.usuario;
    const mesa = r.mesa;
    const local = mesa.local;

    const duracion_horas = calcularDuracionHoras(r.hora_inicio, r.hora_fin);

    // monto_pagado desde Pago (si existe y está aprobado), o 0 si no
    const pago = r.pago;
    const monto_pagado = pago ? Number(pago.monto) : 0;

    const nombre_cliente = `${cliente.primer_apellido}${
      cliente.segundo_apellido ? " " + cliente.segundo_apellido : ""
    } ${cliente.nombre}`;

    return {
      id_reserva: r.id_reserva,
      id_mesa: r.id_mesa,
      nombre_local: local.nombre,
      numero_mesa: mesa.numero_mesa,
      nombre_cliente,
      fecha_reserva: r.fecha_reserva,
      hora_inicio: r.hora_inicio,
      duracion_horas,
      monto_pagado,
      estado_reserva: r.estado_reserva,
    };
  });
}

/**
 * Finaliza una reserva (estado_reserva → FINALIZADA) y libera la mesa (estado_mesa → DISPONIBLE),
 * validando que la reserva pertenezca al local del propietario.
 */
export async function finalizarReservaMesaEnUsoService(
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
      },
    });

    if (!reserva) {
      throw new Error(
        "RESERVA_NO_ENCONTRADA: La reserva especificada no existe."
      );
    }

    if (!reserva.mesa || !reserva.mesa.local) {
      throw new Error(
        "RESERVA_INCONSISTENTE: La reserva no está asociada correctamente a un local."
      );
    }

    if (reserva.mesa.local.id_usuario_admin !== idUsuarioPropietario) {
      throw new Error(
        "RESERVA_NO_PERTENECE_LOCAL: La reserva no pertenece a un local administrado por este usuario."
      );
    }

    if (
      reserva.estado_reserva === EstadoReserva.CANCELADA ||
      reserva.estado_reserva === EstadoReserva.FINALIZADA
    ) {
      throw new Error(
        "RESERVA_NO_ACTIVA: Solo se pueden finalizar reservas activas."
      );
    }

    const reservaActualizada = await tx.reserva.update({
      where: { id_reserva },
      data: {
        estado_reserva: EstadoReserva.FINALIZADA,
      },
    });

    const mesaActualizada = await tx.mesa.update({
      where: { id_mesa: reserva.id_mesa },
      data: {
        estado: EstadoMesa.DISPONIBLE,
      },
    });

    return {
      id_reserva: reservaActualizada.id_reserva,
      id_mesa: mesaActualizada.id_mesa,
      estado_reserva: reservaActualizada.estado_reserva,
      estado_mesa: mesaActualizada.estado,
    };
  });
}
