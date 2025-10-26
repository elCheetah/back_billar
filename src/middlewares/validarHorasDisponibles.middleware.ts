// src/middlewares/validarHorasDisponibles.middleware.ts
import { NextFunction, Request, Response } from "express";

/** YYYY-MM-DD -> Date (UTC 00:00) o null si inválida */
function parseYYYYMMDD(s: unknown): Date | null {
  if (typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function finDeDiaUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function diaSemanaDeFechaUTC(d: Date): "LUNES"|"MARTES"|"MIERCOLES"|"JUEVES"|"VIERNES"|"SABADO"|"DOMINGO" {
  const dow = d.getUTCDay(); // 0=Domingo..6=Sábado
  return ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"][dow] as any;
}

export function validarHorasDisponibles(req: Request, res: Response, next: NextFunction) {
  try {
    const idMesaNum = Number(req.params.idMesa);
    if (!Number.isInteger(idMesaNum) || idMesaNum <= 0) {
      return res.status(400).json({ ok: false, message: "Id de mesa inválido." });
    }

    const { fecha } = req.query;
    const fechaUTC = parseYYYYMMDD(fecha);
    if (!fechaUTC) {
      return res.status(400).json({ ok: false, message: "Fecha inválida. Usa 'YYYY-MM-DD'." });
    }

    (req as any).entradaHoras = {
      idMesa: idMesaNum,
      fechaUTC,
      fechaUTCFin: finDeDiaUTC(fechaUTC),
      diaSemana: diaSemanaDeFechaUTC(fechaUTC),
    };
    return next();
  } catch {
    return res.status(400).json({ ok: false, message: "Parámetros inválidos." });
  }
}
