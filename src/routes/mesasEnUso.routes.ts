// src/routes/mesasEnUso.routes.ts
import { Router } from "express";
import { MesasEnUsoController } from "../controllers/mesasEnUso.controller";
import { validarFinalizarMesaEnUso } from "../middlewares/mesasEnUso.middlewares";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// GET /api/mesas-en-uso  -> lista mesas ocupadas de mi local (hoy)
router.get(
  "/",
  requireAuth,
  MesasEnUsoController.listarMesasEnUso
);

// PATCH /api/mesas-en-uso/finalizar/:id_reserva  -> finaliza reserva y libera mesa
router.patch(
  "/finalizar/:id_reserva",
  requireAuth,
  validarFinalizarMesaEnUso,
  MesasEnUsoController.finalizarReserva
);

export default router;
