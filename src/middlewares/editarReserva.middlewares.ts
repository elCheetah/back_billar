import { Request, Response, NextFunction } from "express";

export interface EditarReservaBody {
  fecha_reserva: string; // "YYYY-MM-DD"
  hora_inicio: string;   // "HH:mm"
}

export function validarEditarReserva(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id_reserva } = req.params;
  const { fecha_reserva, hora_inicio } = req.body ?? {};

  const errores: string[] = [];

  // id_reserva entero positivo
  const idNum = Number(id_reserva);
  if (!id_reserva || Number.isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
    errores.push("El parámetro 'id_reserva' debe ser un entero positivo.");
  }

  // fecha_reserva formato YYYY-MM-DD
  if (
    !fecha_reserva ||
    typeof fecha_reserva !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha_reserva)
  ) {
    errores.push(
      "El campo 'fecha_reserva' es obligatorio y debe tener formato 'YYYY-MM-DD'."
    );
  }

  // hora_inicio formato HH:mm
  const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!hora_inicio || typeof hora_inicio !== "string" || !horaRegex.test(hora_inicio)) {
    errores.push(
      "El campo 'hora_inicio' es obligatorio y debe tener formato 'HH:mm'."
    );
  }

  if (errores.length) {
    return res.status(400).json({
      ok: false,
      message: "Datos inválidos para reprogramar la reserva.",
      errors: errores,
    });
  }

  (req as any).editarReservaPayload = {
    fecha_reserva,
    hora_inicio,
  } as EditarReservaBody;

  return next();
}
