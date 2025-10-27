import { Request, Response } from "express";
import { JwtPayloadUser } from "../types/auth";
import {
  obtenerMiDescuento,
  actualizarMiDescuento,
  restablecerMiDescuento,
} from "../services/miDescuentoLocal.service";

/**
 * GET /api/local/descuento
 * Devuelve el descuento actual del local del propietario autenticado.
 */
export async function verMiDescuento(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const data = await obtenerMiDescuento(user.id);
    return res.json({
      ok: true,
      id_local: data.id_local,
      descuento_global: data.descuento_global,
      vigente: data.descuento_global > 0,
      mensaje:
        data.descuento_global > 0
          ? `Tienes un descuento activo del ${data.descuento_global}% para tus clientes.`
          : "No tienes un descuento vigente. Configura uno para ofrecer beneficios a tus clientes.",
    });
  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local registrado." });
    }
    if (e?.code === "VARIOS_LOCALES") {
      return res.status(409).json({ ok: false, message: "Se detectaron múltiples locales." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al obtener descuento." });
  }
}

/**
 * PUT /api/local/descuento
 * Actualiza o define un nuevo descuento global (0–100).
 */
export async function actualizarDescuento(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const nuevoDescuento = (req as any).nuevoDescuento as number;
    const data = await actualizarMiDescuento(user.id, nuevoDescuento);

    return res.json({
      ok: true,
      message:
        nuevoDescuento > 0
          ? `Descuento actualizado correctamente a ${nuevoDescuento}%.`
          : "Descuento desactivado.",
      id_local: data.id_local,
      descuento_global: data.descuento_global,
    });
  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local registrado." });
    }
    if (e?.code === "VARIOS_LOCALES") {
      return res.status(409).json({ ok: false, message: "Se detectaron múltiples locales." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al actualizar descuento." });
  }
}

/**
 * DELETE /api/local/descuento
 * Restablece el descuento (lo deja en 0%).
 */
export async function eliminarDescuento(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtPayloadUser | undefined;
    if (!user?.id || !user?.rol) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }
    if (user.rol !== "PROPIETARIO") {
      return res.status(403).json({ ok: false, message: "Solo propietarios." });
    }

    const data = await restablecerMiDescuento(user.id);
    return res.json({
      ok: true,
      message: "Descuento restablecido a 0%.",
      id_local: data.id_local,
      descuento_global: data.descuento_global,
    });
  } catch (e: any) {
    if (e?.code === "NO_LOCAL") {
      return res.status(404).json({ ok: false, message: "No tienes un local registrado." });
    }
    if (e?.code === "VARIOS_LOCALES") {
      return res.status(409).json({ ok: false, message: "Se detectaron múltiples locales." });
    }
    return res.status(500).json({ ok: false, message: e?.message || "Error al restablecer descuento." });
  }
}
