// src/services/horarios.service.ts
import prisma from "../config/database";
import {
  DiaSemana, haySolape, hhmmAFechaUTC, fechaUTCaHHmm, normalizarDiaSemana,
} from "../utils/hora";

// --- LECTURA ---
export async function listarHorariosPorLocal(idLocal: number, soloActivos: boolean) {
  const where = { id_local: idLocal, ...(soloActivos ? { estado: "ACTIVO" as const } : {}) };

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
}

// --- GUARDAR PARCIAL (1..N días) ---
type TurnoDTO = { hora_apertura: string; hora_cierre: string; estado?: "ACTIVO" | "INACTIVO" };
type DiaTurnosDTO = { dia_semana: string; turnos: TurnoDTO[] };

export async function guardarParcial(input: {
  idLocal: number;
  dias: DiaTurnosDTO[];                 // 1..7 días
  modo?: "REEMPLAZAR" | "REEMPLAZAR_TODO" | "MERGE"; // default REEMPLAZAR
}) {
  const { idLocal } = input;
  const modo = input.modo ?? "REEMPLAZAR";

  // Si MERGE: cargamos existentes
  const existentesPorDia: Record<DiaSemana, { a: Date; c: Date }[]> = {
    LUNES: [], MARTES: [], MIERCOLES: [], JUEVES: [], VIERNES: [], SABADO: [], DOMINGO: [],
  };
  if (modo === "MERGE") {
    const ex = await prisma.horarioLocal.findMany({ where: { id_local: idLocal } });
    for (const e of ex) {
      (existentesPorDia[e.dia_semana as DiaSemana] ??= []).push({ a: e.hora_apertura, c: e.hora_cierre });
    }
  }

  const payloadDias = input.dias.map((d) => {
    const dia = normalizarDiaSemana(d.dia_semana);
    const nuevos = d.turnos.map((t) => ({
      ini: hhmmAFechaUTC(t.hora_apertura),
      fin: hhmmAFechaUTC(t.hora_cierre),
      estado: t.estado ?? "ACTIVO" as const,
    }));

    if (modo === "MERGE") {
      for (const n of nuevos) {
        for (const e of existentesPorDia[dia]) {
          if (haySolape(n.ini, n.fin, e.a, e.c)) {
            throw new Error(`Solape con horarios existentes en ${dia}.`);
          }
        }
      }
    }
    return { dia, nuevos };
  });

  return prisma.$transaction(async (tx) => {
    if (modo === "REEMPLAZAR_TODO") {
      await tx.horarioLocal.deleteMany({ where: { id_local: idLocal } });
    }

    const creados: any[] = [];
    for (const d of payloadDias) {
      if (modo !== "MERGE") {
        // REEMPLAZAR (los días enviados) o REEMPLAZAR_TODO (ya limpiamos todo arriba)
        await tx.horarioLocal.deleteMany({ where: { id_local: idLocal, dia_semana: d.dia } });
      }
      for (const n of d.nuevos) {
        const c = await tx.horarioLocal.create({
          data: {
            id_local: idLocal,
            dia_semana: d.dia,
            hora_apertura: n.ini,
            hora_cierre: n.fin,
            estado: n.estado,
          },
        });
        creados.push(c);
      }
    }
    return creados;
  });
}

// --- EDITAR / ELIMINAR / ESTADO ---
export async function actualizarTurno(input: {
  idLocal: number;
  idHorario: number;
  hora_apertura?: string;
  hora_cierre?: string;
  estado?: "ACTIVO" | "INACTIVO";
}) {
  const actual = await prisma.horarioLocal.findUnique({ where: { id_horario: input.idHorario } });
  if (!actual || actual.id_local !== input.idLocal) throw new Error("Horario no encontrado.");

  const nuevaA = input.hora_apertura ? hhmmAFechaUTC(input.hora_apertura) : actual.hora_apertura;
  const nuevaC = input.hora_cierre   ? hhmmAFechaUTC(input.hora_cierre)   : actual.hora_cierre;
  if (!(nuevaA < nuevaC)) throw new Error("apertura < cierre.");

  const otros = await prisma.horarioLocal.findMany({
    where: { id_local: input.idLocal, dia_semana: actual.dia_semana, NOT: { id_horario: actual.id_horario } },
  });
  for (const o of otros) {
    if (haySolape(nuevaA, nuevaC, o.hora_apertura, o.hora_cierre)) {
      throw new Error("Solapa con otro turno del día.");
    }
  }

  return prisma.horarioLocal.update({
    where: { id_horario: actual.id_horario },
    data: {
      hora_apertura: nuevaA,
      hora_cierre:   nuevaC,
      ...(input.estado ? { estado: input.estado } : {}),
    },
  });
}

export async function eliminarTurno(idLocal: number, idHorario: number) {
  const fila = await prisma.horarioLocal.findUnique({ where: { id_horario: idHorario } });
  if (!fila || fila.id_local !== idLocal) throw new Error("Horario no encontrado.");
  await prisma.horarioLocal.delete({ where: { id_horario: idHorario } });
  return true;
}

export async function cambiarEstadoDeTurno(idLocal: number, idHorario: number, estado: "ACTIVO" | "INACTIVO") {
  const fila = await prisma.horarioLocal.findUnique({ where: { id_horario: idHorario } });
  if (!fila || fila.id_local !== idLocal) throw new Error("Horario no encontrado.");
  return prisma.horarioLocal.update({ where: { id_horario: idHorario }, data: { estado } });
}
