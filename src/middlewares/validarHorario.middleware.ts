import { Request, Response, NextFunction } from "express";
import { hhmmAFechaUTC, normalizarDiaSemana } from "../utils/hora";

export function validarGuardarDiaBody(req: Request, res: Response, next: NextFunction) {
  try {
    // Valida parámetro día
    normalizarDiaSemana(String(req.params.dia_semana));

    const { turnos } = req.body || {};
    if (!Array.isArray(turnos)) {
      return res.status(400).json({ ok: false, message: "Se requiere 'turnos' (arreglo)." });
    }
    // Validar formato y solapes internos rápidos (el service vuelve a validar)
    const conv = turnos.map((t: any, i: number) => {
      const a = hhmmAFechaUTC(String(t.hora_apertura));
      const c = hhmmAFechaUTC(String(t.hora_cierre));
      if (!(a < c)) throw new Error(`Turno ${i + 1}: apertura < cierre.`);
      if (t.estado && !["ACTIVO","INACTIVO"].includes(String(t.estado).toUpperCase())) {
        throw new Error(`Turno ${i + 1}: estado inválido.`);
      }
      return { a, c };
    });
    // Chequeo O(n^2) para respuesta temprana
    for (let i = 0; i < conv.length; i++) {
      for (let j = i + 1; j < conv.length; j++) {
        if (conv[i].a < conv[j].c && conv[j].a < conv[i].c) {
          return res.status(400).json({ ok: false, message: "Turnos solapados en el día." });
        }
      }
    }

    next();
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "Body inválido." });
  }
}

export function validarEstadoBody(req: Request, res: Response, next: NextFunction) {
  const { estado } = req.body || {};
  if (!["ACTIVO","INACTIVO"].includes(String(estado).toUpperCase())) {
    return res.status(400).json({ ok: false, message: "Estado inválido." });
  }
  return next();
}
