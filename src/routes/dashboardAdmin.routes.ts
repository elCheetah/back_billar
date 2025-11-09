// src/routes/dashboardAdmin.routes.ts
import { Router } from "express";
import { obtenerEstadisticas } from "../controllers/dashboardAdmin.controller";

const router = Router();

router.get("/estadisticas", obtenerEstadisticas);

export default router;
