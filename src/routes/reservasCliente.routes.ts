// src/routes/reservasCliente.routes.ts
import { Router } from "express";
import { auth } from "../middlewares/auth.middleware";
import { ReservasClienteController } from "../controllers/reservasCliente.controller";

const router = Router();

// GET /api/misReservas
router.get("/", auth, ReservasClienteController.misReservas);

export default router;
