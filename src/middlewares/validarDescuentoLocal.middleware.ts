import { Request, Response, NextFunction } from "express";

/**
 * Valida el body para PUT /api/local/descuento
 * Acepta: { descuento: number (0–100) }
 */
export function validarDescuentoLocal(req: Request, res: Response, next: NextFunction) {
  try {
    const { descuento } = req.body || {};
    const num = Number(descuento);

    if (descuento === undefined || descuento === null) {
      return res.status(400).json({ ok: false, message: "Falta el campo 'descuento'." });
    }

    if (isNaN(num) || num < 0 || num > 100) {
      return res.status(400).json({
        ok: false,
        message: "El descuento debe ser un número entre 0 y 100.",
      });
    }

    (req as any).nuevoDescuento = num;
    return next();
  } catch {
    return res.status(400).json({ ok: false, message: "Datos inválidos para descuento." });
  }
}
