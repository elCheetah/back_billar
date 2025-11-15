// src/controllers/reservar.controller.ts
import { Request, Response } from "express";
import { crearReservaConPago } from "../services/reservar.service";
import { CrearReservaBody } from "../middlewares/reservar.middlewares";
import { JwtPayloadUser } from "../types/auth";

export class ReservarController {
  // POST /api/reservas
  static async crearReserva(req: Request, res: Response) {
    try {
      // Usuario desde el token (ya seteado por el middleware auth)
      const user = (req as any).user as JwtPayloadUser | undefined;
      if (!user?.id || !user?.rol) {
        return res
          .status(401)
          .json({ ok: false, message: "No autenticado." });
      }
      if (user.rol !== "CLIENTE") {
        return res.status(403).json({
          ok: false,
          message: "Solo los clientes pueden registrar reservas.",
        });
      }

      // Payload validado por el middleware de body
      const payload = (req as any).reservaPayload as CrearReservaBody | undefined;
      if (!payload) {
        return res.status(400).json({
          ok: false,
          message:
            "Los datos de la reserva no se recibieron correctamente en el servidor.",
        });
      }

      const comprobante = await crearReservaConPago({
        ...payload,
        id_usuario: user.id,
      });

      return res.status(201).json({
        ok: true,
        message: "Reserva registrada. Pago pendiente de verificación.",
        data: comprobante,
      });
    } catch (error: any) {
      const msg: string = error?.message || "Error interno del servidor.";

      if (msg.startsWith("NO_MESA")) {
        return res.status(404).json({
          ok: false,
          message: "La mesa especificada no existe.",
        });
      }
      if (msg.startsWith("NO_LOCAL")) {
        return res.status(404).json({
          ok: false,
          message: "No se encontró el local asociado a la mesa.",
        });
      }
      if (msg.startsWith("LOCAL_INACTIVO")) {
        return res.status(409).json({
          ok: false,
          message: "El local está inactivo y no puede recibir reservas.",
        });
      }
      if (msg.startsWith("CONFLICTO_RESERVA")) {
        return res.status(409).json({
          ok: false,
          message:
            "La mesa ya se encuentra reservada en el horario solicitado.",
        });
      }
      if (msg.startsWith("MESA_BLOQUEADA")) {
        return res.status(409).json({
          ok: false,
          message:
            "La mesa se encuentra bloqueada en el horario solicitado.",
        });
      }
      if (msg.startsWith("RANGO_INVALIDO")) {
        return res.status(400).json({
          ok: false,
          message:
            "El rango horario especificado no es válido para la reserva.",
        });
      }

      console.error("Error al crear reserva:", error);
      return res.status(500).json({
        ok: false,
        message: msg, 
      });
    }
  }
}
