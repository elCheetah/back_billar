// src/routes/filtroLocales.routes.ts
import { Router } from "express";
import { validarFiltroLocales } from "../middlewares/validarFiltroLocales.middleware";
import { filtrarLocales } from "../controllers/filtroLocales.controller";

const router = Router();

/**
 * GET /api/locales/filtro?lat=-17.39&lng=-66.15&radioKm=5&tipoMesa=POOL&texto=centro
 * Todos los parámetros son opcionales. Defaults: centro de Cochabamba y radio 3 km.
 */
router.get("/filtro", validarFiltroLocales, filtrarLocales);

export default router;
