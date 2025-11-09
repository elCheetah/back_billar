// src/controllers/listaLocales.controller.ts
import { Request, Response } from "express";
import { cambiarEstadoLocal, listarLocales } from "../services/listaLocales.service";

export const ListaLocalesController = {
  async listar(_req: Request, res: Response) {
    try {
      const data = await listarLocales();
      return res.json({ ok: true, total: data.length, locales: data });
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message || "Error al listar locales." });
    }
  },

  async activar(req: Request, res: Response) {
    try {
      const id = (req as any).idLocal as number;
      const r = await cambiarEstadoLocal(id, true);
      return res.json({ ok: true, message: "Local activado correctamente.", ...r });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || "No se pudo activar el local." });
    }
  },

  async suspender(req: Request, res: Response) {
    try {
      const id = (req as any).idLocal as number;
      const r = await cambiarEstadoLocal(id, false);
      return res.json({ ok: true, message: "Local suspendido correctamente.", ...r });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || "No se pudo suspender el local." });
    }
  },
};
