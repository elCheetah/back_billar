// src/routes/horasDisponibles.routes.ts
import { Router } from "express";
import { listarHorasDisponibles } from "../controllers/horasDisponibles.controller";
import { validarHorasDisponibles } from "../middlewares/validarHorasDisponibles.middleware";

const router = Router();

/**
 * GET /api/mesas/:idMesa/horas-disponibles?fecha=YYYY-MM-DD
 * - Respuesta SOLO: { ok, id_mesa, horasLibres }
 * - Horas enteras (HH:00), dentro de turnos ACTIVO y sin solape con reservas (excepto CANCELADA)
 * - Si la fecha es HOY (Bolivia): aplica tolerancia 5 minutos para la hora actual
 * - Si la fecha es pasada (Bolivia): retorna []
 */
router.get("/:idMesa/horas-disponibles", validarHorasDisponibles, listarHorasDisponibles);

export default router;
