// src/controllers/historialReservas.controller.ts
import { Request, Response } from "express";
import { obtenerHistorialReservasUsuario } from "../services/historialReservas.service";

export async function listarHistorialCliente(req: Request, res: Response) {
  try {
    const user = (req as any).user as { id: number };
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    const meses = req.query.meses ? Number(req.query.meses) : 3;
    const data = await obtenerHistorialReservasUsuario(user.id, meses);
    return res.json({ ok: true, total: data.length, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e.message || "Error obteniendo historial." });
  }
}
