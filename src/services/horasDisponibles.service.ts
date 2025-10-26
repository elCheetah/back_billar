// src/services/horasDisponibles.service.ts
import prisma from "../config/database";
import { haySolape, horaActualAncladaUTC, hoyLaPazYYYYMMDD, fechaUTCaYYYYMMDD } from "../utils/hora";

type Entrada = {
  idMesa: number;
  fechaUTC: Date;
  fechaUTCFin: Date;
  diaSemana: "LUNES"|"MARTES"|"MIERCOLES"|"JUEVES"|"VIERNES"|"SABADO"|"DOMINGO";
};

// helpers de hora anclada a 1970-01-01 UTC
function horaSlotUTC(h: number) {
  return new Date(Date.UTC(1970, 0, 1, h, 0, 0, 0));
}

export async function obtenerHorasDisponiblesPorMesaYFecha(entrada: Entrada): Promise<{
  id_mesa: number;
  horasLibres: string[];
}> {
  // 1) Mesa -> obtener local
  const mesa = await prisma.mesa.findUnique({
    where: { id_mesa: entrada.idMesa },
    select: { id_mesa: true, id_local: true },
  });
  if (!mesa) {
    throw Object.assign(new Error("Mesa no encontrada."), { status: 404 });
  }

  // 2) Turnos del local para el día (solo ACTIVO)
  const turnos = await prisma.horarioLocal.findMany({
    where: {
      id_local: mesa.id_local,
      dia_semana: entrada.diaSemana,
      estado: "ACTIVO",
    },
    select: { hora_apertura: true, hora_cierre: true },
    orderBy: [{ hora_apertura: "asc" }],
  });

  // 3) Reservas de esa fecha (cualquier estado excepto CANCELADA)
  const reservas = await prisma.reserva.findMany({
    where: {
      id_mesa: mesa.id_mesa,
      fecha_reserva: { gte: entrada.fechaUTC, lte: entrada.fechaUTCFin },
      estado_reserva: { not: "CANCELADA" },
    },
    select: { hora_inicio: true, hora_fin: true },
  });

  // 4) Determinar si la fecha solicitada es HOY en Bolivia
  const hoyBo = hoyLaPazYYYYMMDD();
  const fechaSolicitada = fechaUTCaYYYYMMDD(entrada.fechaUTC);

  // Si la fecha es PASADA (antes de hoy Bolivia), no devolvemos slots
  if (fechaSolicitada < hoyBo) {
    return { id_mesa: mesa.id_mesa, horasLibres: [] };
  }

  // Tolerancia: si es HOY, aplicar lógica de hora actual de Bolivia (anclada)
  let horaActual = -1;
  let minutoActual = -1;
  if (fechaSolicitada === hoyBo) {
    const ahoraUTC = horaActualAncladaUTC(); // Date(1970-01-01 HH:mm:ss) en Bolivia
    horaActual = ahoraUTC.getUTCHours();
    minutoActual = ahoraUTC.getUTCMinutes();
  }

  // 5) Generar slots horarios enteros (00..23) y filtrar
  const horasLibres: string[] = [];
  for (let h = 0; h < 24; h++) {
    const slotIni = horaSlotUTC(h);
    const slotFin = horaSlotUTC(h + 1);

    // Dentro de algún turno activo
    const dentroDeTurno = turnos.some(
      (t) => t.hora_apertura <= slotIni && slotFin <= t.hora_cierre
    );
    if (!dentroDeTurno) continue;

    // No solapado con reservas
    const ocupado = reservas.some((r) => haySolape(slotIni, slotFin, r.hora_inicio, r.hora_fin));
    if (ocupado) continue;

    // Si es HOY (Bolivia): solo horas futuras según tolerancia
    if (fechaSolicitada === hoyBo) {
      if (h < horaActual) continue; // pasado
      if (h === horaActual && minutoActual > 5) continue; // pasó la tolerancia de 5 min
    }

    horasLibres.push(`${h.toString().padStart(2, "0")}:00`);
  }

  // Orden natural ascendente por construcción (00..23)
  return { id_mesa: mesa.id_mesa, horasLibres };
}
