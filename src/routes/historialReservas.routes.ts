// src/routes/historialReservas.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validarHistorialRango } from "../middlewares/validarHistorialRango.middleware";
import { listarHistorial } from "../controllers/historialReservas.controller";

/**
 * GET /api/reservas/historial?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * - Solo CLIENTE (su historial) o PROPIETARIO (de su(s) local(es))
 * - Estados: FINALIZADA / CANCELADA
 * - Rango máximo: 1 año
 * - Devuelve: más reciente primero
 */
const router = Router();
router.get("/historial", requireAuth, validarHistorialRango, listarHistorial);
export default router;
