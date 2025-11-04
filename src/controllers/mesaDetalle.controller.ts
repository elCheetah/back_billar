import { Request, Response } from "express";
import {
  getMesasDelLocalActivas,
  getMesaPorIdDetalle,
  MesasDelLocalResponse,
  MesaDetalleResponse,
} from "../services/mesaDetalle.service";

export const MesaDetalleController = {
  // GET /api/locales/mesas-del-local/:idLocal
  async mesasDelLocal(req: Request, res: Response) {
    try {
      const idLocal = (req as any).idLocal as number; // viene validado por middleware
      const data: MesasDelLocalResponse = await getMesasDelLocalActivas(idLocal);
      return res.json({ ok: true, data });
    } catch (err: any) {
      return res
        .status(400)
        .json({ ok: false, message: err?.message || "Error al obtener mesas del local." });
    }
  },

  // GET /api/locales/mesa/:idMesa
  async mesaPorId(req: Request, res: Response) {
    try {
      const idMesa = (req as any).idMesa as number; // viene validado por middleware
      const data: MesaDetalleResponse = await getMesaPorIdDetalle(idMesa);
      return res.json({ ok: true, data });
    } catch (err: any) {
      return res
        .status(400)
        .json({ ok: false, message: err?.message || "Error al obtener mesa." });
    }
  },
};
