import { Request, Response } from "express";
import { HorariosService } from "../services/horarios.service";

export const HorariosController = {
  // GET /horarios?activos=true
  async listar(req: Request, res: Response) {
    try {
      const soloActivos = String(req.query.activos || "").toLowerCase() === "true";
      const data = await HorariosService.listar(req.user!.id, soloActivos);
      return res.json({ ok: true, data });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e.message || "Error al listar horarios." });
    }
  },

  // PUT /horarios/dia/:dia_semana  (botón Guardar del día)
  async guardarDia(req: Request, res: Response) {
    try {
      const dia = String(req.params.dia_semana);
      const { turnos } = req.body || {};
      const data = await HorariosService.guardarDia(req.user!.id, dia, turnos);
      return res.status(201).json({ ok: true, message: "Guardado correcto.", data });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e.message || "No se pudo guardar." });
    }
  },

  // PATCH /horarios/turno/:idHorario/estado
  async cambiarEstado(req: Request, res: Response) {
    try {
      const idHorario = parseInt(req.params.idHorario, 10);
      const { estado } = req.body || {};
      const data = await HorariosService.cambiarEstado(req.user!.id, idHorario, String(estado));
      return res.json({ ok: true, data });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e.message || "No se pudo cambiar el estado." });
    }
  },

  // DELETE /horarios/turno/:idHorario
  async eliminarTurno(req: Request, res: Response) {
    try {
      const idHorario = parseInt(req.params.idHorario, 10);
      await HorariosService.eliminarTurno(req.user!.id, idHorario);
      return res.json({ ok: true, message: "Turno eliminado." });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e.message || "No se pudo eliminar." });
    }
  },
};
