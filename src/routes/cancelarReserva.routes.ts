// src/routes/reserva.routes.ts
import { Router } from "express";
import { cancelarReservaController } from "../controllers/cancelarReserva.controller";
import { validarCancelarReserva } from "../middlewares/validarCancelarReserva.middleware";

const router = Router();

router.patch("/:id_reserva", validarCancelarReserva, cancelarReservaController);

export default router;
