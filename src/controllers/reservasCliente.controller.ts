// src/controllers/reservasCliente.controller.ts
import { Request, Response } from "express";
import { listarMisReservasCliente } from "../services/reservasCliente.service";
import { JwtPayloadUser } from "../types/auth";

export class ReservasClienteController {
  static async misReservas(req: Request, res: Response) {
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

      const reservas = await listarMisReservasCliente(user.id);

      return res.json({
        ok: true,
        reservas, // 🔹 lista única: cada item con su estado_reserva
      });
    } catch (error) {
      console.error("Error al listar mis reservas del cliente:", error);
      return res.status(500).json({
        ok: false,
        message: "Ocurrió un error al obtener las reservas del cliente.",
      });
    }
  }
}
