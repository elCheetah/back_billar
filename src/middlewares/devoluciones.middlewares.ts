import { Request, Response, NextFunction } from "express";

export interface RegistrarReembolsoBody {
  comprobante_reembolso_base64: string;
}

export function validarRegistrarReembolso(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id_reserva } = req.params;
  const { comprobante_reembolso_base64 } = req.body || {};

  const errores: string[] = [];

  const idNum = Number(id_reserva);
  if (
    !id_reserva ||
    Number.isNaN(idNum) ||
    idNum <= 0 ||
    !Number.isInteger(idNum)
  ) {
    errores.push("El parámetro 'id_reserva' debe ser un entero positivo.");
  }

  if (
    !comprobante_reembolso_base64 ||
    typeof comprobante_reembolso_base64 !== "string" ||
    !comprobante_reembolso_base64.startsWith("data:image/")
  ) {
    errores.push(
      "El campo 'comprobante_reembolso_base64' es obligatorio y debe ser una dataURI de imagen válida."
    );
  }

  if (errores.length) {
    return res.status(400).json({
      ok: false,
      message: "Datos inválidos para registrar el reembolso.",
      errors: errores,
    });
  }

  (req as any).reembolsoPayload = {
    comprobante_reembolso_base64,
  } as RegistrarReembolsoBody;

  return next();
}
