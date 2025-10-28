import { Request, Response, NextFunction } from "express";

const soloLetras = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/;
const empiezaConMayuscula = /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s]*$/;
const celularValido = /^[0-9]{6,20}$/;

export function validarEditarPerfil(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre, primer_apellido, segundo_apellido, celular, correo, password, rol, estado } = req.body || {};

    // Campos no permitidos
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
    if ((!base64 || typeof base64 !== "string") && (!url_remota || typeof url_remota !== "string")) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar 'imagen.base64' (data URI) o 'imagen.url_remota'.",
      });
    }
    next();
  } catch {
    return res.status(400).json({ ok: false, message: "Datos inválidos." });
  }
}
