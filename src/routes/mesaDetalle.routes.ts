import { Router } from "express";
import { validarIdLocal, validarIdMesa } from "../middlewares/validarMesaDetalle.middleware";
import { obtenerMesasDelLocal, obtenerMesaPorId } from "../controllers/mesaDetalle.controller";

const router = Router();

/**
 * GET /api/locales/mesas-del-local/:idLocal
 *  - Lista mesas del local SOLO en estados: DISPONIBLE u OCUPADO.
 */
router.get("/mesas-del-local/:idLocal", validarIdLocal, obtenerMesasDelLocal);

/**
 * GET /api/locales/mesa/:idMesa
 *  - Detalle de una mesa por id, con TODAS sus imágenes y qrLocal del local.
 */
router.get("/mesa/:idMesa", validarIdMesa, obtenerMesaPorId);

export default router;
