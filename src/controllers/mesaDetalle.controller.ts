import { Request, Response } from "express";
import {
  getMesasDelLocalActivas,
  getMesaPorIdDetalle,
  MesasDelLocalResponse,
  MesaDetalleResponse,
} from "../services/mesaDetalle.service";

export async function obtenerMesasDelLocal(req: Request, res: Response) {
  try {
    const idLocal = (req as any).idLocal as number;
    const data: MesasDelLocalResponse = await getMesasDelLocalActivas(idLocal);
    return res.json({ ok: true, ...data });
  } catch (e: any) {
    const code = e?.code === "NOT_FOUND" ? 404 : 500;
    return res.status(code).json({ ok: false, message: e?.message || "Error al obtener mesas del local." });
  }
}

export async function obtenerMesaPorId(req: Request, res: Response) {
  try {
    const idMesa = (req as any).idMesa as number;
    const data: MesaDetalleResponse = await getMesaPorIdDetalle(idMesa);
    return res.json({ ok: true, ...data });
  } catch (e: any) {
    const code = e?.code === "NOT_FOUND" ? 404 : 500;
    return res.status(code).json({ ok: false, message: e?.message || "Error al obtener mesa." });
  }
}
