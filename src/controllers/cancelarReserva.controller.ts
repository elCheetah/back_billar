// src/controllers/cancelarReserva.controller.ts
import { Request, Response } from "express";
import { cancelarReservaService } from "../services/cancelarReserva.service";

export async function cancelarReservaController(req: Request, res: Response) {
  try {
    const { id_reserva } = req.params;
    const { monto_penalizacion_aplicada, qr_base64 } = req.body;

    const result = await cancelarReservaService({
      id_reserva: Number(id_reserva),
      monto_penalizacion_aplicada: Number(monto_penalizacion_aplicada),
      qr_base64,
    });

    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Error en cancelarReservaController:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Ocurrió un error inesperado al cancelar la reserva.",
    });
  }
}
