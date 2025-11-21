// src/middlewares/mesasEnUso.middlewares.ts
import { Request, Response, NextFunction } from "express";

export function validarFinalizarMesaEnUso(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id_reserva } = req.params;
  const errores: string[] = [];

  const idNum = Number(id_reserva);
  if (!id_reserva || Number.isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
    errores.push("El parámetro 'id_reserva' debe ser un entero positivo.");
  }

  if (errores.length) {
    return res.status(400).json({
      ok: false,
      message: "Datos inválidos para finalizar la reserva.",
      errors: errores,
    });
  }

  return next();
}
