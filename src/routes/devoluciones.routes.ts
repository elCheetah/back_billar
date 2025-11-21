import { Router } from "express";
import { DevolucionesController } from "../controllers/devoluciones.controller";
import { validarRegistrarReembolso } from "../middlewares/devoluciones.middlewares";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/canceladas",
  requireAuth,
  DevolucionesController.listarPendientes
);

router.patch(
  "/:id_reserva",
  validarRegistrarReembolso,
  DevolucionesController.registrarReembolso
);

export default router;
