// src/services/editarReserva.service.ts
import prisma from "../config/database";
import { EstadoReserva } from "@prisma/client";

type EditarReservaInput = {
  id_reserva: number;
  id_usuario: number;
  fecha_reserva: string; // "YYYY-MM-DD"
  hora_inicio: string;   // "HH:mm"
};

function construirFechaHora(fecha: string, hora: string): Date {
  const [hour, minute] = hora.split(":").map(Number);
  const base = new Date(`${fecha}T00:00:00`);
  base.setHours(hour, minute, 0, 0);
  return base;
}

export async function editarReservaService(input: EditarReservaInput) {
  const { id_reserva, id_usuario, fecha_reserva, hora_inicio } = input;

  const reserva = await prisma.reserva.findUnique({
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
    throw new Error("RESERVA_NO_ENCONTRADA: La reserva especificada no existe.");
  }

  if (reserva.id_usuario !== id_usuario) {
    throw new Error(
      "RESERVA_NO_PROPIA: La reserva no pertenece al usuario autenticado."
    );
  }

  if (
    reserva.estado_reserva === EstadoReserva.CANCELADA ||
    reserva.estado_reserva === EstadoReserva.FINALIZADA
  ) {
    throw new Error(
      "RESERVA_NO_EDITABLE: La reserva ya no puede ser reprogramada."
    );
  }

  if (!reserva.mesa || !reserva.mesa.local) {
    throw new Error(
      "NO_LOCAL: La reserva no tiene un local asociado registrado correctamente."
    );
  }

  if (reserva.mesa.local.estado !== "ACTIVO") {
    throw new Error(
      "LOCAL_INACTIVO: El local no se encuentra activo para recibir reservas."
    );
  }

  const duracionMs =
    reserva.hora_fin.getTime() - reserva.hora_inicio.getTime();

  if (duracionMs <= 0) {
    throw new Error(
      "RANGO_INVALIDO: La duración actual de la reserva no es válida."
    );
  }

  const nuevaFechaDate = new Date(`${fecha_reserva}T00:00:00`);
  const nuevaHoraInicio = construirFechaHora(fecha_reserva, hora_inicio);
  const nuevaHoraFin = new Date(nuevaHoraInicio.getTime() + duracionMs);

  const reservaConflicto = await prisma.reserva.findFirst({
    where: {
      id_mesa: reserva.id_mesa,
      fecha_reserva: nuevaFechaDate,
      estado_reserva: {
        in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA],
      },
      id_reserva: {
        not: id_reserva,
      },
      hora_inicio: {
        lt: nuevaHoraFin,
      },
      hora_fin: {
        gt: nuevaHoraInicio,
      },
    },
  });

  if (reservaConflicto) {
    throw new Error(
      "CONFLICTO_RESERVA: Ya existe una reserva activa que se solapa con el nuevo horario solicitado."
    );
  }

  const bloqueoConflicto = await prisma.bloqueoMesa.findFirst({
    where: {
      id_mesa: reserva.id_mesa,
      fecha_bloqueo: nuevaFechaDate,
      hora_inicio: {
        lt: nuevaHoraFin,
      },
      hora_fin: {
        gt: nuevaHoraInicio,
      },
    },
  });

  if (bloqueoConflicto) {
    throw new Error(
      "MESA_BLOQUEADA: La mesa se encuentra bloqueada en el nuevo horario solicitado."
    );
  }

  const reservaActualizada = await prisma.reserva.update({
    where: { id_reserva },
    data: {
      fecha_reserva: nuevaFechaDate,
      hora_inicio: nuevaHoraInicio,
      hora_fin: nuevaHoraFin,
    },
    include: {
      mesa: {
        include: {
          local: true,
        },
      },
    },
  });

  return reservaActualizada;
}
