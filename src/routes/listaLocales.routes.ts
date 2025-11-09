// src/routes/listaLocales.routes.ts
import { Router } from "express";
import { ListaLocalesController } from "../controllers/listaLocales.controller";
import { validarIdParam } from "../middlewares/validarIdUsuario.middleware";
const router = Router();

router.get("/", ListaLocalesController.listar);
router.patch("/activar/:idLocal", validarIdParam("idLocal"), ListaLocalesController.activar);
router.patch("/suspender/:idLocal", validarIdParam("idLocal"), ListaLocalesController.suspender);

export default router;
