import { Request, Response } from "express";
import { EstadoReserva } from "@prisma/client";
import { listarReservasClientePorEstado } from "../services/reservasCliente.service";
import { JwtPayloadUser } from "../types/auth";

export class ReservasClienteController {
  static async reservasPendientes(req: Request, res: Response) {
    try {
      const user = (req as any).user as JwtPayloadUser | undefined;
      if (!user?.id || !user?.rol) {
        return res.status(401).json({ ok: false, message: "No autenticado." });
      }
      if (user.rol !== "CLIENTE") {
        return res.status(403).json({
          ok: false,
          message: "Solo clientes pueden consultar sus reservas.",
        });
      }

      const reservas = await listarReservasClientePorEstado(
        user.id,
        EstadoReserva.PENDIENTE
      );

      return res.json({
        ok: true,
        estado: "PENDIENTE",
        reservas,
      });
    } catch (error) {
      console.error("Error al listar reservas pendientes del cliente:", error);
      return res.status(500).json({
        ok: false,
        message:
          "Ocurrió un error al obtener las reservas pendientes del cliente.",
      });
    }
  }

  static async reservasConfirmadas(req: Request, res: Response) {
    try {
      const user = (req as any).user as JwtPayloadUser | undefined;
      if (!user?.id || !user?.rol) {
        return res.status(401).json({ ok: false, message: "No autenticado." });
      }
      if (user.rol !== "CLIENTE") {
        return res.status(403).json({
          ok: false,
          message: "Solo clientes pueden consultar sus reservas.",
        });
      }

      const reservas = await listarReservasClientePorEstado(
        user.id,
        EstadoReserva.CONFIRMADA
      );

      return res.json({
        ok: true,
        estado: "CONFIRMADA",
        reservas,
      });
    } catch (error) {
      console.error("Error al listar reservas confirmadas del cliente:", error);
      return res.status(500).json({
        ok: false,
        message:
          "Ocurrió un error al obtener las reservas confirmadas del cliente.",
      });
    }
  }
}
