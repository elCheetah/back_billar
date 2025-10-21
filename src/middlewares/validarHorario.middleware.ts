// src/middlewares/validarHorario.middleware.ts
import { Request, Response, NextFunction } from "express";
import { hhmmAFechaUTC, normalizarDiaSemana } from "../utils/hora";

export function validarGuardarParcialBody(req: Request, res: Response, next: NextFunction) {
  try {
    const { dias, modo } = req.body || {};
    if (!Array.isArray(dias) || dias.length === 0) {
      return res.status(400).json({ ok: false, message: "Se requiere 'dias' (arreglo con 1..7 elementos)." });
    }
    if (modo && !["REEMPLAZAR", "REEMPLAZAR_TODO", "MERGE"].includes(String(modo))) {
      return res.status(400).json({ ok: false, message: "modo inválido." });
    }

    for (const d of dias) {
      const dia = normalizarDiaSemana(String(d?.dia_semana));
      if (!("turnos" in d) || !Array.isArray(d.turnos)) {
        return res.status(400).json({ ok: false, message: `El día ${dia} debe incluir 'turnos' (puede ser []).` });
      }
      // validar formato y solapes internos
      const conv = d.turnos.map((t: any) => {
        const a = hhmmAFechaUTC(String(t.hora_apertura));
        const c = hhmmAFechaUTC(String(t.hora_cierre));
        if (!(a < c)) throw new Error(`Turno inválido en ${dia}: apertura < cierre.`);
        if (t.estado && !["ACTIVO","INACTIVO"].includes(String(t.estado))) {
          throw new Error(`Estado inválido en ${dia}: ACTIVO/INACTIVO.`);
        }
        return { a, c };
      });
      for (let i = 0; i < conv.length; i++) {
        for (let j = i + 1; j < conv.length; j++) {
          if (conv[i].a < conv[j].c && conv[j].a < conv[i].c) {
            return res.status(400).json({ ok: false, message: `Turnos solapados en ${dia}.` });
          }
        }
      }
    }
    next();
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "Body inválido." });
  }
}

export function validarEditarTurnoBody(req: Request, res: Response, next: NextFunction) {
  try {
    const { hora_apertura, hora_cierre, estado } = req.body || {};
    if (hora_apertura === undefined && hora_cierre === undefined && estado === undefined) {
      return res.status(400).json({ ok: false, message: "Nada que actualizar." });
    }
    if (estado && !["ACTIVO","INACTIVO"].includes(String(estado))) {
      return res.status(400).json({ ok: false, message: "estado inválido (ACTIVO/INACTIVO)." });
    }
    if (hora_apertura !== undefined) hhmmAFechaUTC(String(hora_apertura));
    if (hora_cierre   !== undefined) hhmmAFechaUTC(String(hora_cierre));
    next();
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "Datos inválidos." });
  }
}
