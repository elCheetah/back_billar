import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validarDescuentoLocal } from "../middlewares/validarDescuentoLocal.middleware";
import {
  verMiDescuento,
  actualizarDescuento,
  eliminarDescuento,
} from "../controllers/miDescuentoLocal.controller";

/**
 * Rutas del descuento del local del propietario autenticado.
 *
 * GET    /api/local/descuento     -> Ver descuento actual
 * PUT    /api/local/descuento     -> Actualizar descuento (body: { descuento })
 * DELETE /api/local/descuento     -> Restablecer (0%)
 */
const router = Router();

router.get("/descuento", requireAuth, verMiDescuento);
router.put("/descuento", requireAuth, validarDescuentoLocal, actualizarDescuento);
router.delete("/descuento", requireAuth, eliminarDescuento);

export default router;
