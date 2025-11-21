// src/controllers/cancelarReserva.controller.ts
import { Request, Response } from "express";
import { cancelarReservaService } from "../services/cancelarReserva.service";
import { CancelarReservaBody } from "../middlewares/validarCancelarReserva.middleware";

export async function cancelarReservaController(req: Request, res: Response) {
  try {
    const { id_reserva } = req.params;
    const payload = (req as any).cancelarPayload as
      | CancelarReservaBody
      | undefined;

    if (!payload) {
      return res.status(400).json({
        ok: false,
        message:
          "Los datos para cancelar la reserva no se recibieron correctamente en el servidor.",
      });
    }

    const data = await cancelarReservaService({
      id_reserva: Number(id_reserva),
      monto_penalizacion_aplicada: payload.monto_penalizacion_aplicada,
      qr_base64: payload.qr_base64,
    });

    return res.status(200).json({
      ok: true,
      message:
        "Reserva cancelada correctamente. Se registró el QR para reembolso y la penalización aplicada.",
      data,
    });
  } catch (error: any) {
    const msg: string = error?.message || "Error interno del servidor.";

    if (msg.startsWith("RESERVA_NO_ENCONTRADA")) {
      return res.status(404).json({
        ok: false,
        message: "La reserva no existe.",
      });
    }

    if (msg.startsWith("RESERVA_NO_CANCELABLE")) {
      return res.status(409).json({
        ok: false,
        message:
          "La reserva ya no puede ser cancelada (ya está cancelada o finalizada).",
      });
    }

    if (msg.startsWith("PAGO_NO_ENCONTRADO")) {
      return res.status(409).json({
        ok: false,
        message:
          "La reserva no tiene un pago asociado, no es posible registrar QR de reembolso.",
      });
    }

    console.error("Error al cancelar reserva:", error);
    return res.status(500).json({
      ok: false,
      message: msg,
    });
  }
}
