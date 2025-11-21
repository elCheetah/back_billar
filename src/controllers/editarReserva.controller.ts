// src/controllers/editarReserva.controller.ts
import { Request, Response } from "express";
import { editarReservaService } from "../services/editarReserva.service";
import { EditarReservaBody } from "../middlewares/editarReserva.middlewares";
import { JwtPayloadUser } from "../types/auth";

export class EditarReservaController {
  // PATCH /api/editarReserva/:id_reserva
  static async editarReserva(req: Request, res: Response) {
    try {
      const user = (req as any).user as JwtPayloadUser | undefined;

      if (!user?.id || !user?.rol) {
        return res.status(401).json({
          ok: false,
          message: "No autenticado.",
        });
      }

      if (user.rol !== "CLIENTE") {
        return res.status(403).json({
          ok: false,
          message: "Solo los clientes pueden reprogramar reservas.",
        });
      }

      const { id_reserva } = req.params;
      const payload = (req as any).editarReservaPayload as
        | EditarReservaBody
        | undefined;

      if (!payload) {
        return res.status(400).json({
          ok: false,
          message:
            "Los datos de la reserva no se recibieron correctamente en el servidor.",
        });
      }

      const reservaActualizada = await editarReservaService({
        id_reserva: Number(id_reserva),
        id_usuario: user.id,
        fecha_reserva: payload.fecha_reserva,
        hora_inicio: payload.hora_inicio,
      });

      return res.status(200).json({
        ok: true,
        message: "Reserva reprogramada correctamente.",
        data: reservaActualizada,
      });
    } catch (error: any) {
      const msg: string = error?.message || "Error interno del servidor.";

      if (msg.startsWith("RESERVA_NO_ENCONTRADA")) {
        return res.status(404).json({
          ok: false,
          message: "La reserva especificada no existe.",
        });
      }

      if (msg.startsWith("RESERVA_NO_PROPIA")) {
        return res.status(403).json({
          ok: false,
          message:
            "La reserva no pertenece al usuario autenticado.",
        });
      }

      if (msg.startsWith("RESERVA_NO_EDITABLE")) {
        return res.status(409).json({
          ok: false,
          message:
            "La reserva ya no puede ser reprogramada (cancelada o finalizada).",
        });
      }

      if (msg.startsWith("NO_LOCAL")) {
        return res.status(404).json({
          ok: false,
          message: "No se encontró el local asociado a la reserva.",
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
            "Ya existe una reserva activa que se solapa con el nuevo horario solicitado.",
        });
      }

      if (msg.startsWith("MESA_BLOQUEADA")) {
        return res.status(409).json({
          ok: false,
          message:
            "La mesa se encuentra bloqueada en el nuevo horario solicitado.",
        });
      }

      if (msg.startsWith("RANGO_INVALIDO")) {
        return res.status(400).json({
          ok: false,
          message:
            "La duración actual de la reserva no es válida, no se pudo recalcular el horario.",
        });
      }

      console.error("Error al reprogramar reserva:", error);
      return res.status(500).json({
        ok: false,
        message: msg,
      });
    }
  }
}
