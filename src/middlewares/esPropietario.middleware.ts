// src/middlewares/esPropietario.middleware.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

export async function esPropietarioDelLocal(req: Request, res: Response, next: NextFunction) {
  try {
    const idLocal = Number(req.params.idLocal);
    if (Number.isNaN(idLocal)) return res.status(400).json({ ok: false, message: "idLocal inválido." });

    const local = await prisma.local.findUnique({
      where: { id_local: idLocal },
      select: { id_usuario_admin: true },
    });
    if (!local) return res.status(404).json({ ok: false, message: "Local no encontrado." });

    const user = (req as any).user as { id: number; rol: string };
    if (!user) return res.status(401).json({ ok: false, message: "No autenticado." });

    if (user.rol === "ADMINISTRADOR" || user.id === local.id_usuario_admin) return next();
    return res.status(403).json({ ok: false, message: "Sin permiso para este local." });
  } catch {
    return res.status(500).json({ ok: false, message: "Error de autorización." });
  }
}
