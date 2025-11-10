import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { resumenDashboard, reservasConfirmadasPorFecha } from "../controllers/dashboardPropietario.controller";
import { validarFechaConsulta } from "../middlewares/validarFechaDashboard.middleware";

/**
 * Dashboard propietario
 */
const router = Router();

router.get("/resumen", requireAuth, resumenDashboard);
router.get("/reservas-confirmadas", requireAuth, validarFechaConsulta, reservasConfirmadasPorFecha);

export default router;
