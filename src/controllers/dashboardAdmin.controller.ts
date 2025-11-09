// src/controllers/dashboardAdmin.controller.ts
import { Request, Response } from "express";
import { obtenerEstadisticasDashboard } from "../services/dashboardAdmin.service";

export async function obtenerEstadisticas(_req: Request, res: Response) {
  try {
    const data = await obtenerEstadisticasDashboard();
    return res.json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || "Error al obtener estadísticas." });
  }
}
