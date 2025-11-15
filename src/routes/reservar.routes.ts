// src/routes/reservar.routes.ts
import { Router } from "express";
import { ReservarController } from "../controllers/reservar.controller";
import { auth } from "../middlewares/auth.middleware";
import { validarCrearReserva } from "../middlewares/reservar.middlewares";

const router = Router();

// POST /api/reservas
router.post("/", auth, validarCrearReserva, ReservarController.crearReserva);

export default router;
