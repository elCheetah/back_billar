// src/middlewares/validarQrLocal.middleware.ts
import { Request, Response, NextFunction } from "express";

/**
 * Valida el body para PUT /api/mi-local/qr
 * Acepta:
 *  - base64: data URI o base64
 *  - url_remota: http/https
 * Debe venir al menos uno.
 */
export function validarQrLocal(req: Request, res: Response, next: NextFunction) {
  try {
    const { base64, url_remota } = (req.body || {}) as { base64?: string; url_remota?: string };

    const b64 = typeof base64 === "string" ? base64.trim() : "";
    const url = typeof url_remota === "string" ? url_remota.trim() : "";

    if (!b64 && !url) {
      return res.status(400).json({ ok: false, message: "Falta contenido de imagen." });
    }

    if (url && !/^https?:\/\/.+/i.test(url)) {
      return res.status(400).json({ ok: false, message: "URL inválida." });
    }

    if (b64 && !/^data:image\/[a-z]+;base64,/i.test(b64) && !/^[A-Za-z0-9+/=]+$/.test(b64)) {
      // Permitimos dataURI o base64 "puro"
      return res.status(400).json({ ok: false, message: "Base64 inválido." });
    }

    (req as any).qrEntrada = {
      base64: b64 || undefined,
      url_remota: url || undefined,
    };

    return next();
  } catch {
    return res.status(400).json({ ok: false, message: "Datos inválidos." });
  }
}
