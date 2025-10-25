// src/middlewares/validarHistorialRango.middleware.ts
import { Request, Response, NextFunction } from "express";

function parseYYYYMMDD(s: unknown): Date | null {
  if (typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  // Validar que la fecha sea consistente (p.ej. 2024-02-31 no existe)
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function finDeDiaUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function validarHistorialRango(req: Request, res: Response, next: NextFunction) {
  try {
    const { desde, hasta } = req.query;

    const desdeUTC = parseYYYYMMDD(desde);
    const hastaUTC = parseYYYYMMDD(hasta);

    if (!desdeUTC || !hastaUTC) {
      return res.status(400).json({ ok: false, message: "Fechas inválidas. Usa 'YYYY-MM-DD'." });
    }
    if (hastaUTC < desdeUTC) {
      return res.status(400).json({ ok: false, message: "Rango de fechas inválido." });
    }

    // Límite: máx 1 año (365 días)
    const MS_DIA = 24 * 60 * 60 * 1000;
    const diffDias = Math.floor((finDeDiaUTC(hastaUTC).getTime() - desdeUTC.getTime()) / MS_DIA) + 1;
    if (diffDias > 365) {
      return res.status(400).json({ ok: false, message: "El rango no puede superar 1 año." });
    }

    (req as any).rangoFechas = { desdeUTC, hastaUTC: finDeDiaUTC(hastaUTC) };
    return next();
  } catch {
    return res.status(400).json({ ok: false, message: "Parámetros de fecha inválidos." });
  }
}
