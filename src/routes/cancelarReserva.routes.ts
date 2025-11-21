// src/routes/reserva.routes.ts
import { Router } from "express";
import { cancelarReservaController } from "../controllers/cancelarReserva.controller";

const router = Router();

router.patch("/:id_reserva", cancelarReservaController);

export default router;
