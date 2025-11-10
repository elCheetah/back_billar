
import { Request, Response } from "express";
import { JwtPayloadUser } from "../types/auth";
import { obtenerResumenDeHoy, listarConfirmadasPorFecha } from "../services/dashboardPropietario.service";

export async function resumenDashboard(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const data = await obtenerResumenDeHoy(user.id);
    return res.json({ ok: true, ...data });

  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al obtener resumen." });
  }
}

export async function reservasConfirmadasPorFecha(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const fecha = (req as any).consultaFecha;
    const reservas = await listarConfirmadasPorFecha(user.id, fecha);

    return res.json({ ok: true, fecha, reservas });

  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al obtener reservas confirmadas." });
  }
}
