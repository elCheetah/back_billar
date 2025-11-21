// src/controllers/mesasEnUso.controller.ts
import { Request, Response } from "express";
import {
  listarMesasEnUsoPropietario,
  finalizarReservaMesaEnUsoService,
} from "../services/mesasEnUso.service";
import { JwtPayloadUser } from "../types/auth";

export class MesasEnUsoController {
  // GET /api/mesas-en-uso
  static async listarMesasEnUso(req: Request, res: Response) {
    try {
      const user = (req as any).user as JwtPayloadUser | undefined;

      if (!user?.id || !user?.rol) {
        return res.status(401).json({
          ok: false,
          message: "No autenticado.",
        });
      }

      if (user.rol !== "PROPIETARIO") {
        return res.status(403).json({
          ok: false,
          message: "Solo propietarios pueden consultar mesas en uso.",
        });
      }

      const mesasEnUso = await listarMesasEnUsoPropietario(user.id);

      return res.json({
        ok: true,
        mesasEnUso,
      });
    } catch (error) {
      console.error("Error al listar mesas en uso:", error);
      return res.status(500).json({
        ok: false,
        message: "Ocurrió un error al obtener las mesas en uso.",
      });
    }
  }

  // PATCH /api/mesas-en-uso/finalizar/:id_reserva
  static async finalizarReserva(req: Request, res: Response) {
    try {
      const user = (req as any).user as JwtPayloadUser | undefined;

      if (!user?.id || !user?.rol) {
        return res.status(401).json({
          ok: false,
          message: "No autenticado.",
        });
      }

      if (user.rol !== "PROPIETARIO") {
        return res.status(403).json({
          ok: false,
          message: "Solo propietarios pueden finalizar mesas en uso.",
        });
      }

      const { id_reserva } = req.params;

      const resultado = await finalizarReservaMesaEnUsoService(
        Number(id_reserva),
        user.id
      );

      return res.status(200).json({
        ok: true,
        message: "Reserva finalizada y mesa liberada correctamente.",
        data: resultado,
      });
    } catch (error: any) {
      const msg: string = error?.message || "Error interno del servidor.";

      if (msg.startsWith("RESERVA_NO_ENCONTRADA")) {
        return res.status(404).json({
          ok: false,
          message: "La reserva especificada no existe.",
        });
      }

      if (msg.startsWith("RESERVA_INCONSISTENTE")) {
        return res.status(409).json({
          ok: false,
          message:
            "La reserva no se encuentra asociada correctamente a una mesa/local.",
        });
      }

      if (msg.startsWith("RESERVA_NO_PERTENECE_LOCAL")) {
        return res.status(403).json({
          ok: false,
          message:
            "La reserva no pertenece a un local administrado por el usuario autenticado.",
        });
      }

      if (msg.startsWith("RESERVA_NO_ACTIVA")) {
        return res.status(409).json({
          ok: false,
          message:
            "Solo se pueden finalizar reservas activas (no canceladas ni finalizadas).",
        });
      }

      console.error("Error al finalizar reserva en uso:", error);
      return res.status(500).json({
        ok: false,
        message: msg,
      });
    }
  }
}
