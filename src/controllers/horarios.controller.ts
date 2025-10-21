// src/controllers/horarios.controller.ts
import { Request, Response } from "express";
import {
  listarHorariosPorLocal, guardarParcial, actualizarTurno,
  eliminarTurno, cambiarEstadoDeTurno,
} from "../services/horarios.service";

// -------- LECTURAS --------
export async function listarHorariosPropietario(req: Request, res: Response) {
  try {
    const idLocal = Number(req.params.idLocal);
    if (Number.isNaN(idLocal)) return res.status(400).json({ ok: false, message: "idLocal inválido." });

    const soloActivos = String(req.query.activos || "").toLowerCase() === "true";
    const data = await listarHorariosPorLocal(idLocal, soloActivos);
    return res.json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e.message || "Error listando horarios." });
  }
}

export async function listarHorariosPublico(req: Request, res: Response) {
  try {
    const idLocal = Number(req.params.idLocal);
    if (Number.isNaN(idLocal)) return res.status(400).json({ ok: false, message: "idLocal inválido." });

    const todos = await listarHorariosPorLocal(idLocal, true);
    // Para clientes, devolvemos SOLO días con algún turno
    const compacto: Record<string, any[]> = {};
    Object.entries(todos).forEach(([dia, arr]) => { if ((arr as any[]).length) compacto[dia] = arr; });
    return res.json({ ok: true, data: compacto });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e.message || "Error listando horarios." });
  }
}

// -------- ESCRITURAS --------
// Guardar 1..N días (crear/editar por reemplazo del día). Los días no enviados no se tocan.
export async function guardarParcialController(req: Request, res: Response) {
  try {
    const idLocal = Number(req.params.idLocal);
    if (Number.isNaN(idLocal)) return res.status(400).json({ ok: false, message: "idLocal inválido." });

    const { dias, modo } = req.body;
    const creados = await guardarParcial({ idLocal, dias, modo });
    return res.status(201).json({ ok: true, message: "Guardado correcto.", data: creados });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo guardar." });
  }
}

export async function editarTurnoController(req: Request, res: Response) {
  try {
    const idLocal = Number(req.params.idLocal);
    const idHorario = Number(req.params.idHorario);
    const { hora_apertura, hora_cierre, estado } = req.body || {};
    const act = await actualizarTurno({ idLocal, idHorario, hora_apertura, hora_cierre, estado });
    return res.json({ ok: true, data: act });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo actualizar." });
  }
}

export async function eliminarTurnoController(req: Request, res: Response) {
  try {
    const idLocal = Number(req.params.idLocal);
    const idHorario = Number(req.params.idHorario);
    await eliminarTurno(idLocal, idHorario);
    return res.json({ ok: true, message: "Turno eliminado." });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo eliminar." });
  }
}

export async function cambiarEstadoTurnoController(req: Request, res: Response) {
  try {
    const idLocal = Number(req.params.idLocal);
    const idHorario = Number(req.params.idHorario);
    const { estado } = req.body;
    if (!["ACTIVO","INACTIVO"].includes(String(estado))) {
      return res.status(400).json({ ok: false, message: "estado inválido." });
    }
    const act = await cambiarEstadoDeTurno(idLocal, idHorario, estado);
    return res.json({ ok: true, data: act });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo cambiar el estado." });
  }
}
