import { Request, Response, NextFunction } from "express";
import { param, validationResult } from "express-validator";

function resolverValidacion(req: Request, res: Response, _next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array()[0]?.msg || "Datos inválidos.";
    return res.status(400).json({ ok: false, message: msg });
  }
  _next();
}

// Mantén estos nombres porque así los importas en las rutas
export const validarIdLocal = [
  param("idLocal").isInt({ min: 1 }).withMessage("idLocal inválido."),
  resolverValidacion,
];

export const validarIdMesa = [
  param("idMesa").isInt({ min: 1 }).withMessage("idMesa inválido."),
  resolverValidacion,
];
