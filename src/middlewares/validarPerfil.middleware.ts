import { Request, Response, NextFunction } from "express";

const soloLetras = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/;
const empiezaConMayuscula = /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s]*$/;
const celularValido = /^[0-9]{6,20}$/;
const esDataUriImagen = (v: string) => /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(v.trim());

export function validarEditarPerfil(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre, primer_apellido, segundo_apellido, celular, correo, password, rol, estado } = req.body || {};

    // Campos NO editables por esta ruta
    if (correo !== undefined || password !== undefined || rol !== undefined || estado !== undefined) {
      return res.status(400).json({ ok: false, message: "Solo puedes editar nombre, apellidos y celular." });
    }

    if (nombre !== undefined) {
      if (typeof nombre !== "string" || !soloLetras.test(nombre) || !empiezaConMayuscula.test(nombre)) {
        return res.status(400).json({ ok: false, message: "Nombre inválido." });
      }
    }

    if (primer_apellido !== undefined) {
      if (typeof primer_apellido !== "string" || !soloLetras.test(primer_apellido) || !empiezaConMayuscula.test(primer_apellido)) {
        return res.status(400).json({ ok: false, message: "Primer apellido inválido." });
      }
    }

    if (segundo_apellido !== undefined && segundo_apellido !== null && segundo_apellido !== "") {
      if (typeof segundo_apellido !== "string" || !soloLetras.test(segundo_apellido) || !empiezaConMayuscula.test(segundo_apellido)) {
        return res.status(400).json({ ok: false, message: "Segundo apellido inválido." });
      }
    }

    if (celular !== undefined && celular !== null && celular !== "") {
      if (typeof celular !== "string" || !celularValido.test(celular)) {
        return res.status(400).json({ ok: false, message: "Celular inválido (6 a 20 dígitos)." });
      }
    }

    next();
  } catch {
    return res.status(400).json({ ok: false, message: "Datos inválidos." });
  }
}

export function validarFotoPerfil(req: Request, res: Response, next: NextFunction) {
  try {
    const { imagen } = req.body || {};
    if (!imagen || typeof imagen !== "object") {
      return res.status(400).json({ ok: false, message: "Se requiere 'imagen'." });
    }

    const { base64, url_remota } = imagen;

    // ESTRICTO: solo base64 permitido (data URI). No se admite url_remota.
    if (url_remota !== undefined) {
      return res.status(400).json({ ok: false, message: "Solo se acepta 'imagen.base64' (data URI)." });
    }
    if (typeof base64 !== "string" || !esDataUriImagen(base64)) {
      return res.status(400).json({ ok: false, message: "base64 inválido. Usa data URI: 'data:image/...;base64,...'." });
    }

    next();
  } catch {
    return res.status(400).json({ ok: false, message: "Datos inválidos." });
  }
}
