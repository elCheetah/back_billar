// src/middlewares/validarHistorial.middleware.ts
import { Request, Response, NextFunction } from "express";

export function validarQueryHistorial(req: Request, res: Response, next: NextFunction) {
  const mesesQ = req.query.meses;
  if (mesesQ === undefined) return next();

  const meses = Number(mesesQ);
  if (!Number.isFinite(meses) || meses <= 0 || meses > 12) {
    return res.status(400).json({
      ok: false,
      message: "Parámetro 'meses' inválido. Usa un número entre 1 y 12 (por defecto 3).",
    });
  }
  return next();
}
