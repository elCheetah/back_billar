// src/controllers/horasDisponibles.controller.ts
import { Request, Response } from "express";
import { obtenerHorasDisponiblesPorMesaYFecha } from "../services/horasDisponibles.service";

export async function listarHorasDisponibles(req: Request, res: Response) {
  try {
    const entrada = (req as any).entradaHoras as {
      idMesa: number;
      fechaUTC: Date;
      fechaUTCFin: Date;
      diaSemana: string;
    };
    if (!entrada?.idMesa || !entrada?.fechaUTC || !entrada?.fechaUTCFin || !entrada?.diaSemana) {
      return res.status(400).json({ ok: false, message: "Parámetros inválidos." });
    }

    const data = await obtenerHorasDisponiblesPorMesaYFecha(entrada as any);
    return res.json({ ok: true, id_mesa: data.id_mesa, horasLibres: data.horasLibres });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const msg = e?.message || "Error obteniendo horas disponibles.";
    return res.status(status).json({ ok: false, message: msg });
  }
}
