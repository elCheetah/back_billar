// src/controllers/historialReservas.controller.ts
import { Request, Response } from "express";
import { historialCliente, historialPropietario } from "../services/historialReservas.service";
import { JwtPayloadUser } from "../types/auth";

export async function listarHistorial(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    const rango = (req as any).rangoFechas as { desdeUTC: Date; hastaUTC: Date };
    if (!rango?.desdeUTC || !rango?.hastaUTC) {
      return res.status(400).json({ ok: false, message: "Fechas inválidas." });
    }

    if (user.rol === "CLIENTE") {
      const data = await historialCliente(user.id, rango);
      return res.json({ ok: true, total: data.length, data });
    }

    if (user.rol === "PROPIETARIO") {
      const data = await historialPropietario(user.id, rango);
      return res.json({ ok: true, total: data.length, data });
    }

    // ADMIN u otros roles: no permitido en este endpoint
    return res.status(403).json({ ok: false, message: "Rol no autorizado." });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Error obteniendo historial.",
    });
  }
}
