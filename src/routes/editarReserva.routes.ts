// src/routes/editarReserva.routes.ts
import { Router } from "express";
import { EditarReservaController } from "../controllers/editarReserva.controller";
import { auth } from "../middlewares/auth.middleware";
import { validarEditarReserva } from "../middlewares/editarReserva.middlewares";

const router = Router();

// PATCH /api/editarReserva/:id_reserva
router.patch(
  "/:id_reserva",
  auth,
  validarEditarReserva,
  EditarReservaController.editarReserva
);

export default router;
