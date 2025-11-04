// src/controllers/mesaDetalle.controller.ts
import { Request, Response } from "express";
import {
  getMesasDelLocalActivas,
  getMesaPorIdDetalle,
  MesasDelLocalResponse,
  MesaDetalleResponse,
} from "../services/mesaDetalle.service";

export const MesaDetalleController = {
  async mesasDelLocal(req: Request, res: Response) {
    try {
      const idLocal = (req as any).idLocal as number;
      const data: MesasDelLocalResponse = await getMesasDelLocalActivas(idLocal);
      return res.json({ ok: true, data });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err?.message || "Error al obtener mesas del local." });
    }
  },

  async mesaPorId(req: Request, res: Response) {
    try {
      const idMesa = (req as any).idMesa as number;
      const data: MesaDetalleResponse = await getMesaPorIdDetalle(idMesa);
      return res.json({ ok: true, data });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err?.message || "Error al obtener mesa." });
    }
  },
};
