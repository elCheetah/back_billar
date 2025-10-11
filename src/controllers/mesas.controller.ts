import { Request, Response } from 'express';
import { MesasService } from '../services/mesas.service';

export const MesasController = {
  async crear(req: Request, res: Response) {
    try {
      const result = await MesasService.crear(req.body, req.user!.id);
      return res.status(201).json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err?.message || 'No se pudo crear la mesa.' });
    }
  },

  async listarPorLocal(req: Request, res: Response) {
    try {
      const localId = parseInt(String(req.query.localId), 10);
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 10;

      const result = await MesasService.listarPorLocal(localId, req.user!.id, page, pageSize);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err?.message || 'No se pudo obtener la lista de mesas.' });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const mesa = await MesasService.obtener(id, req.user!.id);
      return res.json({ ok: true, mesa });
    } catch (err: any) {
      return res.status(404).json({ ok: false, message: err?.message || 'Mesa no encontrada.' });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await MesasService.actualizar({ id_mesa: id, ...req.body }, req.user!.id);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err?.message || 'No se pudo actualizar la mesa.' });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await MesasService.eliminar(id, req.user!.id);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err?.message || 'No se pudo eliminar la mesa.' });
    }
  }
};
