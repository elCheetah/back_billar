// src/controllers/perfil.controller.ts
import { Request, Response } from "express";
import { editarPerfilUsuario, obtenerPerfilUsuario, actualizarFotoPerfilUsuario } from "../services/perfil.service";

export async function verMiPerfil(req: Request, res: Response) {
  try {
    const user = (req as any).user as { id: number };
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    const data = await obtenerPerfilUsuario(user.id);
    return res.json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e.message || "Error recuperando el perfil." });
  }
}

export async function editarMiPerfil(req: Request, res: Response) {
  try {
    const user = (req as any).user as { id: number };
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    const data = await editarPerfilUsuario(user.id, req.body || {});
    return res.json({ ok: true, data, message: "Perfil actualizado." });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo actualizar el perfil." });
  }
}

export async function actualizarMiFotoPerfil(req: Request, res: Response) {
  try {
    const user = (req as any).user as { id: number };
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    const { imagen } = req.body;
    const data = await actualizarFotoPerfilUsuario(user.id, imagen);
    return res.json({ ok: true, data, message: "Foto de perfil actualizada." });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo actualizar la foto de perfil." });
  }
}
