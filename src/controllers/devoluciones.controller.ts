import { Request, Response } from "express";
import {
  listarDevolucionesPendientesPropietario,
  registrarReembolsoService,
} from "../services/devoluciones.service";
import { JwtPayloadUser } from "../types/auth";
import { RegistrarReembolsoBody } from "../middlewares/devoluciones.middlewares";

export class DevolucionesController {
  static async listarPendientes(req: Request, res: Response) {
    try {
      const user = (req as any).user as JwtPayloadUser | undefined;

      if (!user?.id || !user?.rol) {
        return res.status(401).json({ ok: false, message: "No autenticado." });
      }

      if (user.rol !== "PROPIETARIO") {
        return res.status(403).json({
          ok: false,
          message: "Solo los propietarios pueden ver sus devoluciones pendientes.",
        });
      }

      const devoluciones = await listarDevolucionesPendientesPropietario(
        user.id
      );

      return res.json({
        ok: true,
        devoluciones,
      });
    } catch (error) {
      console.error("Error al listar devoluciones pendientes:", error);
      return res.status(500).json({
        ok: false,
        message:
          "Ocurrió un error al obtener las devoluciones pendientes del propietario.",
      });
    }
  }

  static async registrarReembolso(req: Request, res: Response) {
    try {
      const { id_reserva } = req.params;
      const payload = (req as any).reembolsoPayload as
        | RegistrarReembolsoBody
        | undefined;

      if (!payload) {
        return res.status(400).json({
          ok: false,
          message:
            "Los datos del comprobante de reembolso no se recibieron correctamente.",
        });
      }

      const data = await registrarReembolsoService({
        id_reserva: Number(id_reserva),
        comprobante_reembolso_base64: payload.comprobante_reembolso_base64,
      });

      return res.status(200).json({
        ok: true,
        message: "Reembolso registrado correctamente.",
        data,
      });
    } catch (error: any) {
      const msg: string = error?.message || "Error interno del servidor.";

      if (msg.startsWith("RESERVA_NO_ENCONTRADA")) {
        return res.status(404).json({
          ok: false,
          message: "No se encontró la reserva asociada al reembolso.",
        });
      }

      if (msg.startsWith("RESERVA_NO_CANCELADA")) {
        return res.status(409).json({
          ok: false,
          message: "Solo se pueden reembolsar reservas que ya estén canceladas.",
        });
      }

      if (msg.startsWith("PAGO_NO_APROBADO")) {
        return res.status(409).json({
          ok: false,
          message:
            "Solo se pueden registrar reembolsos para pagos aprobados previamente.",
        });
      }

      if (msg.startsWith("REEMBOLSO_YA_REGISTRADO")) {
        return res.status(409).json({
          ok: false,
          message: "Esta reserva ya fue marcada como reembolsada.",
        });
      }

      if (msg.startsWith("QR_CLIENTE_NO_REGISTRADO")) {
        return res.status(409).json({
          ok: false,
          message:
            "No se encontró el QR proporcionado por el cliente para este reembolso.",
        });
      }

      if (msg.startsWith("IMAGEN_INVALIDA")) {
        return res.status(400).json({
          ok: false,
          message:
            "El comprobante de reembolso enviado no es válido. Debe ser una imagen en formato base64 (dataURI).",
        });
      }

      if (msg.startsWith("RESERVA_INCONSISTENTE")) {
        return res.status(500).json({
          ok: false,
          message:
            "Los datos de la reserva asociada son inconsistentes. Contacte con soporte.",
        });
      }

      console.error("Error al registrar reembolso:", error);
      return res.status(500).json({
        ok: false,
        message: msg,
      });
    }
  }
}
