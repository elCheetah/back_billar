import { Request, Response } from "express";
import {
  listarSolicitudesReservaPropietario,
  aceptarSolicitudReservaService,
  rechazarSolicitudReservaService,
} from "../services/solicitudesReservas.service";
import { JwtPayloadUser } from "../types/auth";

export class SolicitudesReservasController {
  static async listarSolicitudes(req: Request, res: Response) {
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
          message: "Solo propietarios pueden ver las solicitudes de reservas.",
        });
      }

      const solicitudes = await listarSolicitudesReservaPropietario(user.id);

      return res.json({
        ok: true,
        solicitudes,
      });
    } catch (error) {
      console.error("Error al listar solicitudes de reservas:", error);
      return res.status(500).json({
        ok: false,
        message: "Ocurrió un error al obtener las solicitudes de reservas.",
      });
    }
  }

  static async aceptarSolicitud(req: Request, res: Response) {
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
          message: "Solo propietarios pueden aceptar reservas.",
        });
      }

      const { id_reserva } = req.params;

      const resultado = await aceptarSolicitudReservaService(
        Number(id_reserva),
        user.id
      );

      return res.status(200).json({
        ok: true,
        message: "Reserva aceptada correctamente.",
        data: resultado,
      });
    } catch (error: any) {
      const msg: string = error?.message || "Error interno del servidor.";

      if (msg === "RESERVA_NO_ENCONTRADA") {
        return res.status(404).json({
          ok: false,
          message: "La reserva especificada no existe.",
        });
      }

      if (msg === "RESERVA_INCONSISTENTE") {
        return res.status(409).json({
          ok: false,
          message:
            "La reserva no se encuentra asociada correctamente a una mesa/local.",
        });
      }

      if (msg === "RESERVA_NO_PERTENECE_LOCAL") {
        return res.status(403).json({
          ok: false,
          message:
            "La reserva no pertenece a un local administrado por el usuario autenticado.",
        });
      }

      if (msg === "PAGO_NO_REGISTRADO") {
        return res.status(409).json({
          ok: false,
          message: "La reserva no tiene un pago registrado.",
        });
      }

      if (msg === "PAGO_YA_APROBADO") {
        return res.status(409).json({
          ok: false,
          message: "El pago ya se encontraba aprobado.",
        });
      }

      if (msg === "PAGO_YA_RECHAZADO") {
        return res.status(409).json({
          ok: false,
          message: "El pago ya se encontraba rechazado.",
        });
      }

      if (msg === "RESERVA_NO_VIGENTE") {
        return res.status(409).json({
          ok: false,
          message:
            "Solo se pueden aceptar reservas que sigan vigentes (pendientes o confirmadas).",
        });
      }

      console.error("Error al aceptar solicitud de reserva:", error);
      return res.status(500).json({
        ok: false,
        message: msg,
      });
    }
  }

  static async rechazarSolicitud(req: Request, res: Response) {
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
          message: "Solo propietarios pueden rechazar reservas.",
        });
      }

      const { id_reserva } = req.params;

      const resultado = await rechazarSolicitudReservaService(
        Number(id_reserva),
        user.id
      );

      return res.status(200).json({
        ok: true,
        message: "Reserva rechazada correctamente.",
        data: resultado,
      });
    } catch (error: any) {
      const msg: string = error?.message || "Error interno del servidor.";

      if (msg === "RESERVA_NO_ENCONTRADA") {
        return res.status(404).json({
          ok: false,
          message: "La reserva especificada no existe.",
        });
      }

      if (msg === "RESERVA_INCONSISTENTE") {
        return res.status(409).json({
          ok: false,
          message:
            "La reserva no se encuentra asociada correctamente a una mesa/local.",
        });
      }

      if (msg === "RESERVA_NO_PERTENECE_LOCAL") {
        return res.status(403).json({
          ok: false,
          message:
            "La reserva no pertenece a un local administrado por el usuario autenticado.",
        });
      }

      if (msg === "PAGO_NO_REGISTRADO") {
        return res.status(409).json({
          ok: false,
          message: "La reserva no tiene un pago registrado.",
        });
      }

      if (msg === "PAGO_YA_RECHAZADO") {
        return res.status(409).json({
          ok: false,
          message: "El pago ya se encontraba rechazado.",
        });
      }

      if (msg === "PAGO_YA_APROBADO") {
        return res.status(409).json({
          ok: false,
          message: "No se puede rechazar un pago que ya fue aprobado.",
        });
      }

      if (msg === "RESERVA_NO_VIGENTE") {
        return res.status(409).json({
          ok: false,
          message:
            "Solo se pueden rechazar reservas que sigan vigentes (no canceladas ni finalizadas).",
        });
      }

      console.error("Error al rechazar solicitud de reserva:", error);
      return res.status(500).json({
        ok: false,
        message: msg,
      });
    }
  }
}
