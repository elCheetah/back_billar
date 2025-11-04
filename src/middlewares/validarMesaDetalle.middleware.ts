import { NextFunction, Request, Response } from "express";

export function validarIdLocal(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Método no permitido. Solo GET." });
  const raw = req.params?.idLocal;
  const id = Number(raw);
  if (!raw || !/^\d+$/.test(raw) || !Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "idLocal inválido." });
  }
  (req as any).idLocal = id;
  next();
}

export function validarIdMesa(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Método no permitido. Solo GET." });
  const raw = req.params?.idMesa;
  const id = Number(raw);
  if (!raw || !/^\d+$/.test(raw) || !Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "idMesa inválido." });
  }
  (req as any).idMesa = id;
  next();
}
