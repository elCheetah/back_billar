import { Request, Response } from "express";
import { DatosLocalService } from "../services/datosLocal.service";

export const DatosLocalController = {
  // GET /datos-local
  async obtener(req: Request, res: Response) {
    try {
      const data = await DatosLocalService.obtener(req.user!.id);
      return res.json({ ok: true, data });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message || "Error al obtener datos del local." });
    }
  },

  // PUT /datos-local
  async actualizar(req: Request, res: Response) {
    try {
      const result = await DatosLocalService.actualizar(req.user!.id, req.body);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message || "No se pudo actualizar el local." });
    }
  },
};
