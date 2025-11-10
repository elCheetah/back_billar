import { Request, Response, NextFunction } from "express";

/**
 * Valida query ?fecha=YYYY-MM-DD y que sea >= hoy (zona Bolivia UTC-4).
 */
export function validarFechaConsulta(req: Request, res: Response, next: NextFunction) {
  const fecha = String((req.query as any)?.fecha || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ ok: false, message: "Parámetro 'fecha' inválido. Formato YYYY-MM-DD." });
  }

  const hoy = fechaHoyLaPaz();
  if (fecha < hoy) {
    return res.status(400).json({ ok: false, message: "La fecha debe ser mayor o igual a hoy." });
  }

  (req as any).consultaFecha = fecha;
  return next();
}

function fechaHoyLaPaz(): string {
  const now = new Date();
  const laPaz = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const y = laPaz.getUTCFullYear();
  const m = String(laPaz.getUTCMonth() + 1).padStart(2, "0");
  const d = String(laPaz.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
