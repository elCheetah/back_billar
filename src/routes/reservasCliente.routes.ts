import { Router } from "express";
import { auth } from "../middlewares/auth.middleware";
import { ReservasClienteController } from "../controllers/reservasCliente.controller";

const router = Router();

router.get(
  "/pendientes",
  auth,
  ReservasClienteController.reservasPendientes
);

router.get(
  "/confirmadas",
  auth,
  ReservasClienteController.reservasConfirmadas
);

export default router;
