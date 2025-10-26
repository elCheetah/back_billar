// src/controllers/miQrLocal.controller.ts
import { Request, Response } from "express";
import { JwtPayloadUser } from "../types/auth";
import { actualizarMiQr, eliminarMiQr, obtenerMiQr } from "../services/miQrLocal.service";

export async function verMiQr(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const data = await obtenerMiQr(user.id);
    return res.json({ ok: true, id_local: data.id_local, qr_url: data.qr_url });
  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local." });
    }
    if (e?.code === "VARIOS_LOCALES") {
      return res.status(409).json({ ok: false, message: "Se detectaron múltiples locales." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al obtener QR." });
  }
}

export async function actualizarQr(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const img = (req as any).qrEntrada as { base64?: string; url_remota?: string };
    const data = await actualizarMiQr(user.id, img);

    return res.json({ ok: true, message: "QR actualizado.", id_local: data.id_local, qr_url: data.qr_url });
  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local." });
    }
    if (e?.code === "VARIOS_LOCALES") {
      return res.status(409).json({ ok: false, message: "Se detectaron múltiples locales." });
    }
    if (String(e?.message || "").includes("No se envió contenido de imagen")) {
      return res.status(400).json({ ok: false, message: "Falta contenido de imagen." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al actualizar QR." });
  }
}

export async function eliminarQr(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const data = await eliminarMiQr(user.id);
    return res.json({ ok: true, message: "QR eliminado.", id_local: data.id_local, qr_url: data.qr_url });
  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local." });
    }
    if (e?.code === "VARIOS_LOCALES") {
      return res.status(409).json({ ok: false, message: "Se detectaron múltiples locales." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al eliminar QR." });
  }
}
