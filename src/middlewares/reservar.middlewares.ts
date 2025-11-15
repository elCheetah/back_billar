// src/middlewares/reservar.middlewares.ts
import { Request, Response, NextFunction } from "express";

export interface CrearReservaBody {
  id_mesa: number;
  fecha_reserva: string;       // "YYYY-MM-DD"
  hora_inicio: string;         // "HH:mm"
  hora_fin: string;            // "HH:mm"
  comprobante_base64: string;  // data:image/...
}

// Middleware para validar y normalizar el body de creación de reserva
export function validarCrearReserva(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id_mesa, fecha_reserva, hora_inicio, hora_fin, comprobante_base64 } =
    req.body || {};

  // Validar id_mesa
  if (!id_mesa || isNaN(Number(id_mesa))) {
    return res.status(400).json({
      ok: false,
      message: "El campo 'id_mesa' es obligatorio y debe ser numérico.",
    });
  }

  // Validar fecha_reserva (formato simple YYYY-MM-DD)
  if (
    !fecha_reserva ||
    typeof fecha_reserva !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha_reserva)
  ) {
    return res.status(400).json({
      ok: false,
      message:
        "El campo 'fecha_reserva' es obligatorio y debe tener formato 'YYYY-MM-DD'.",
    });
  }

  // Validar hora_inicio y hora_fin (HH:mm)
  const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!hora_inicio || typeof hora_inicio !== "string" || !horaRegex.test(hora_inicio)) {
    return res.status(400).json({
      ok: false,
      message:
        "El campo 'hora_inicio' es obligatorio y debe tener formato 'HH:mm'.",
    });
  }

  if (!hora_fin || typeof hora_fin !== "string" || !horaRegex.test(hora_fin)) {
    return res.status(400).json({
      ok: false,
      message:
        "El campo 'hora_fin' es obligatorio y debe tener formato 'HH:mm'.",
    });
  }

  // Validar que hora_fin > hora_inicio
  const [h1, m1] = hora_inicio.split(":").map(Number);
  const [h2, m2] = hora_fin.split(":").map(Number);
  const inicioMin = h1 * 60 + m1;
  const finMin = h2 * 60 + m2;

  if (finMin <= inicioMin) {
    return res.status(400).json({
      ok: false,
      message:
        "El rango horario no es válido: 'hora_fin' debe ser mayor que 'hora_inicio'.",
    });
  }

  // Validar comprobante_base64
  if (
    !comprobante_base64 ||
    typeof comprobante_base64 !== "string" ||
    !comprobante_base64.startsWith("data:image/")
  ) {
    return res.status(400).json({
      ok: false,
      message:
        "El campo 'comprobante_base64' es obligatorio y debe ser una dataURI de imagen válida.",
    });
  }

  const payload: CrearReservaBody = {
    id_mesa: Number(id_mesa),
    fecha_reserva,
    hora_inicio,
    hora_fin,
    comprobante_base64,
  };

  // Se guarda simple en req, sin tipos especiales
  (req as any).reservaPayload = payload;
  return next();
}
