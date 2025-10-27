import { Request, Response } from "express";
import { MesasService } from "../services/mesas.service";

export const MesasController = {
  async crear(req: Request, res: Response) {
    try {
      const result = await MesasService.crear(req.user!.id, req.body);
      return res.status(201).json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message });
    }
  },

  async listarPorUsuario(req: Request, res: Response) {
    try {
      const mesas = await MesasService.listarPorUsuario(req.user!.id);
      return res.json({ ok: true, total: mesas.length, data: mesas });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await MesasService.actualizar(req.user!.id, id, req.body);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message });
    }
  },

  async cambiarEstado(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { nuevoEstado } = req.body;
      const result = await MesasService.cambiarEstado(req.user!.id, id, nuevoEstado);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { tipo } = req.query;
      const result = await MesasService.eliminar(req.user!.id, id, tipo as "LOGICO" | "FISICO");
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message });
    }
  },
};
