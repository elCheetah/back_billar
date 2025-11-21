// src/middlewares/validarCancelarReserva.middleware.ts
import { Request, Response, NextFunction } from "express";

export function validarCancelarReserva(req: Request, res: Response, next: NextFunction) {
  const { id_reserva } = req.params;
  const { monto_penalizacion_aplicada, qr_base64 } = req.body ?? {};

  const errores: string[] = [];

  // id_reserva debe ser entero positivo
  const idNum = Number(id_reserva);
  if (!id_reserva || Number.isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
    errores.push("El parámetro id_reserva debe ser un entero positivo.");
  }

  // monto_penalizacion_aplicada requerido, número >= 0
  if (monto_penalizacion_aplicada === undefined || monto_penalizacion_aplicada === null) {
    errores.push("El monto de penalización aplicada es obligatorio.");
  } else {
    const montoNum = Number(monto_penalizacion_aplicada);
    if (Number.isNaN(montoNum) || montoNum < 0) {
      errores.push("El monto de penalización aplicada debe ser un número mayor o igual a 0.");
    }
  }

  // qr_base64 requerido, solo base64 (idealmente dataURI)
  if (!qr_base64 || typeof qr_base64 !== "string") {
    errores.push("El QR de reembolso (base64) es obligatorio.");
  } else {
    const esDataUri = qr_base64.startsWith("data:image/");
    const esSoloBase64 = /^[A-Za-z0-9+/=]+$/.test(qr_base64);
    if (!esDataUri && !esSoloBase64) {
      errores.push("El QR debe enviarse como base64 válido (idealmente en formato dataURI).");
    }
  }

  if (errores.length) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos inválidos para cancelar la reserva.",
      errores,
    });
  }

  next();
}
