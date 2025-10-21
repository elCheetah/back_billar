// src/routes/historialReservas.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validarQueryHistorial } from "../middlewares/validarHistorial.middleware";
import { listarHistorialCliente } from "../controllers/historialReservas.controller";

/**
 * GET /api/reservas/historial?meses=3
 * Solo para el USUARIO AUTENTICADO.
 * Devuelve FINALIZADA/CANCELADA de los últimos N meses (default 3),
 * ordenado: más reciente primero.
 */
const router = Router();
router.get("/historial", requireAuth, validarQueryHistorial, listarHistorialCliente);
export default router;
