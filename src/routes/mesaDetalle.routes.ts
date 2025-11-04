// src/routes/mesaDetalle.routes.ts
import { Router } from "express";
import { validarIdLocal, validarIdMesa } from "../middlewares/validarMesaDetalle.middleware";
import { MesaDetalleController } from "../controllers/mesaDetalle.controller";

const router = Router();

router.get("/:idLocal", validarIdLocal, MesaDetalleController.mesasDelLocal);
router.get("/mesa/:idMesa", validarIdMesa, MesaDetalleController.mesaPorId);

export default router;
