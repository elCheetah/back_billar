import { Router } from "express";
import { auth } from "../middlewares/auth.middleware";
import { ReservasClienteController } from "../controllers/reservasCliente.controller";

const router = Router();

router.get("/", auth, ReservasClienteController.listarMisReservas);

export default router;
