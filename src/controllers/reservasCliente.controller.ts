import { Request, Response } from "express";
import { EstadoReserva } from "@prisma/client";
import { listarReservasClientePendientesYConfirmadas } from "../services/reservasCliente.service";
import { JwtPayloadUser } from "../types/auth";

export class ReservasClienteController {
  static async listarMisReservas(req: Request, res: Response) {
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

      const reservas = await listarReservasClientePendientesYConfirmadas(
        user.id
      );

      const pendientes = reservas.filter(
        (r) => r.estado_reserva === EstadoReserva.PENDIENTE
      );
      const confirmadas = reservas.filter(
        (r) => r.estado_reserva === EstadoReserva.CONFIRMADA
      );

      return res.json({
        ok: true,
        pendientes,
        confirmadas,
      });
    } catch (error) {
      console.error("Error al listar reservas del cliente:", error);
      return res.status(500).json({
        ok: false,
        message: "Ocurrió un error al obtener las reservas del cliente.",
      });
    }
  }
}
