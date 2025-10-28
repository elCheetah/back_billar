import { Request, Response } from "express";
import {
  obtenerPerfilUsuario,
  editarPerfilUsuario,
  actualizarFotoPerfilUsuario,
  eliminarFotoPerfilUsuario,
} from "../services/perfil.service";

// GET /perfil
export async function verMiPerfil(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    const data = await obtenerPerfilUsuario(user.id);
    return res.json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e.message || "Error al recuperar el perfil." });
  }
}

// PUT /perfil
export async function editarMiPerfil(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    const data = await editarPerfilUsuario(user.id, req.body || {});
    return res.json({ ok: true, message: "Perfil actualizado.", data });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo actualizar el perfil." });
  }
}

// PUT /perfil/foto
export async function actualizarMiFotoPerfil(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    const { imagen } = req.body;
    const data = await actualizarFotoPerfilUsuario(user.id, imagen);
    return res.json({ ok: true, message: "Foto actualizada.", data });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo actualizar la foto." });
  }
}

// DELETE /perfil/foto
export async function eliminarMiFotoPerfil(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ ok: false, message: "No autenticado." });

    await eliminarFotoPerfilUsuario(user.id);
    return res.json({ ok: true, message: "Foto eliminada." });
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e.message || "No se pudo eliminar la foto." });
  }
}
