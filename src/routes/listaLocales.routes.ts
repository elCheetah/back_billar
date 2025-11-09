// src/routes/listaLocales.routes.ts
import { Router } from "express";
import { ListaLocalesController } from "../controllers/listaLocales.controller";

const router = Router();

router.get("/", ListaLocalesController.listar);
router.patch("/activar/:idLocal", ListaLocalesController.activar);
router.patch("/suspender/:idLocal", ListaLocalesController.suspender);

export default router;
