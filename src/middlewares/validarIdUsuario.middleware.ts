// src/middlewares/validarId.middleware.ts
import { NextFunction, Request, Response } from "express";

export function validarIdParam(nombre: "idUsuario" | "idLocal") {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.params?.[nombre];
    const id = Number(raw);
    if (!raw || !/^\d+$/.test(raw) || !Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: `${nombre} inválido.` });
    }
    (req as any)[nombre] = id;
    next();
  };
}
