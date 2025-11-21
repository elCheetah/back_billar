// src/middlewares/validarCancelarReserva.middleware.ts
import { Request, Response, NextFunction } from "express";

export interface CancelarReservaBody {
  monto_penalizacion_aplicada: number;
  qr_base64: string;
}

export function validarCancelarReserva(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id_reserva } = req.params;
  const { monto_penalizacion_aplicada, qr_base64 } = req.body ?? {};

  const errores: string[] = [];

  const idNum = Number(id_reserva);
  if (!id_reserva || Number.isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
    errores.push("El parámetro id_reserva debe ser un entero positivo.");
  }

  if (
    monto_penalizacion_aplicada === undefined ||
    monto_penalizacion_aplicada === null
  ) {
    errores.push("El monto de penalización aplicada es obligatorio.");
  } else {
    const montoNum = Number(monto_penalizacion_aplicada);
    if (Number.isNaN(montoNum) || montoNum < 0) {
      errores.push(
        "El monto de penalización aplicada debe ser un número mayor o igual a 0."
      );
    }
  }

  if (
    !qr_base64 ||
    typeof qr_base64 !== "string" ||
    !qr_base64.startsWith("data:image/")
  ) {
    errores.push(
      "El campo 'qr_base64' es obligatorio y debe ser una dataURI de imagen válida."
    );
  }

  if (errores.length) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos inválidos para cancelar la reserva.",
      errores,
    });
  }

  (req as any).cancelarPayload = {
    monto_penalizacion_aplicada: Number(monto_penalizacion_aplicada),
    qr_base64,
  } as CancelarReservaBody;

  next();
}
