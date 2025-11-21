// src/routes/reserva.routes.ts
import { Router } from "express";
import { cancelarReservaController } from "../controllers/cancelarReserva.controller";
import { validarCancelarReserva } from "../middlewares/validarCancelarReserva.middleware";

const router = Router();

/**
 * Cancelar una reserva
 * PATCH /api/reservas/:id_reserva/cancelar
 * Body:
 *  - monto_penalizacion_aplicada: number
 *  - qr_base64: string (solo base64 dataURI)
 */
router.patch(
  "/:id_reserva",
  validarCancelarReserva,
  cancelarReservaController
);

export default router;
