// src/controllers/filtroLocales.controller.ts
import { Request, Response } from "express";
import { buscarLocalesFiltrados } from "../services/filtroLocales.service";

export async function filtrarLocales(req: Request, res: Response) {
  try {
    const filtro = (req as any).filtroLocales; // del middleware
    const { total, locales } = await buscarLocalesFiltrados(filtro);

    if (total === 0) {
      return res.json({
        ok: true,
        total: 0,
        message: "No se encontraron locales cercanos",
        locales: [],
      });
    }

    return res.json({ ok: true, total, locales });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Error al filtrar locales.",
    });
  }
}
