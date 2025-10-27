import prisma from "../config/database";
import { DiaSemana, haySolape, hhmmAFechaUTC, fechaUTCaHHmm, normalizarDiaSemana } from "../utils/hora";

type Estado = "ACTIVO" | "INACTIVO";

function assertEstado(v?: string) {
  if (!v) return undefined;
  const up = v.toUpperCase();
  if (up !== "ACTIVO" && up !== "INACTIVO") throw new Error("Estado inválido.");
  return up as Estado;
}

function validarNoSolape(turnos: { ini: Date; fin: Date }[]) {
  const arr = [...turnos].sort((a, b) => a.ini.getTime() - b.ini.getTime());
  for (let i = 0; i < arr.length - 1; i++) {
    if (haySolape(arr[i].ini, arr[i].fin, arr[i + 1].ini, arr[i + 1].fin)) {
      throw new Error("Turnos solapados en el día.");
    }
  }
}

export const HorariosService = {
  async getLocalByUser(userId: number) {
    const local = await prisma.local.findFirst({
      where: { id_usuario_admin: userId, estado: "ACTIVO" },
      select: { id_local: true },
    });
    if (!local) throw new Error("El usuario no tiene un local activo.");
    return local.id_local;
  },

  // Lista los 7 días. Por defecto: activos e inactivos. (?activos=true => solo activos)
  async listar(userId: number, soloActivos = false) {
    const id_local = await this.getLocalByUser(userId);

    const where = { id_local, ...(soloActivos ? { estado: "ACTIVO" as const } : {}) };
    const filas = await prisma.horarioLocal.findMany({
      where,
      orderBy: [{ dia_semana: "asc" }, { hora_apertura: "asc" }],
    });

    const dias: Record<DiaSemana, any[]> = {
      LUNES: [], MARTES: [], MIERCOLES: [], JUEVES: [], VIERNES: [], SABADO: [], DOMINGO: [],
    };

    for (const f of filas) {
      const d = f.dia_semana as DiaSemana;
      dias[d].push({
        id_horario: f.id_horario,
        hora_apertura: fechaUTCaHHmm(f.hora_apertura),
        hora_cierre:   fechaUTCaHHmm(f.hora_cierre),
        estado: f.estado,
        fecha_creacion: f.fecha_creacion,
      });
    }
    return dias;
  },

  // Guardar día (REEMPLAZA el día completo): crear/editar/eliminar en lote
  async guardarDia(
    userId: number,
    dia_semana: string,
    turnos: Array<{ hora_apertura: string; hora_cierre: string; estado?: Estado }>
  ) {
    if (!Array.isArray(turnos)) throw new Error("Se requiere 'turnos' (arreglo).");
    const dia = normalizarDiaSemana(dia_semana);
    const id_local = await this.getLocalByUser(userId);

    const nuevos = turnos.map((t) => {
      const ini = hhmmAFechaUTC(String(t.hora_apertura));
      const fin = hhmmAFechaUTC(String(t.hora_cierre));
      if (!(ini < fin)) throw new Error("apertura < cierre.");
      const estado = assertEstado(t.estado) ?? "ACTIVO";
      return { ini, fin, estado };
    });

    // Validación de solape interna (entre los enviados)
    validarNoSolape(nuevos);

    // Transacción: reemplazar el día
    await prisma.$transaction(async (tx) => {
      await tx.horarioLocal.deleteMany({ where: { id_local, dia_semana: dia } });
      if (nuevos.length) {
        await tx.horarioLocal.createMany({
          data: nuevos.map((n) => ({
            id_local,
            dia_semana: dia,
            hora_apertura: n.ini,
            hora_cierre: n.fin,
            estado: n.estado,
          })),
        });
      }
    });

    // Devolver el día actualizado
    const diaActual = await prisma.horarioLocal.findMany({
      where: { id_local, dia_semana: dia },
      orderBy: { hora_apertura: "asc" },
    });

    return {
      [dia]: diaActual.map((f) => ({
        id_horario: f.id_horario,
        hora_apertura: fechaUTCaHHmm(f.hora_apertura),
        hora_cierre:   fechaUTCaHHmm(f.hora_cierre),
        estado: f.estado,
      })),
    };
  },

  // Cambiar estado de un turno (independiente)
  async cambiarEstado(userId: number, idHorario: number, estado: string) {
    const est = assertEstado(estado);
    if (!Number.isFinite(idHorario)) throw new Error("Id inválido.");

    const id_local = await this.getLocalByUser(userId);

    const fila = await prisma.horarioLocal.findUnique({ where: { id_horario: idHorario } });
    if (!fila || fila.id_local !== id_local) throw new Error("Horario no encontrado.");

    return prisma.horarioLocal.update({
      where: { id_horario: idHorario },
      data: { estado: est! },
    });
  },

  // Eliminar turno puntual (independiente)
  async eliminarTurno(userId: number, idHorario: number) {
    if (!Number.isFinite(idHorario)) throw new Error("Id inválido.");

    const id_local = await this.getLocalByUser(userId);
    const fila = await prisma.horarioLocal.findUnique({ where: { id_horario: idHorario } });
    if (!fila || fila.id_local !== id_local) throw new Error("Horario no encontrado.");

    await prisma.horarioLocal.delete({ where: { id_horario: idHorario } });
    return true;
  },
};
