// src/routes/listaUsuarios.routes.ts
import { Router } from "express";
import { ListaUsuariosController } from "../controllers/listaUsuarios.controller";
import { validarIdParam } from "../middlewares/validarIdUsuario.middleware";

const router = Router();

router.get("/propietarios", ListaUsuariosController.propietarios);
router.get("/clientes", ListaUsuariosController.clientes);
router.patch("/activar/:idUsuario",validarIdParam("idUsuario"),  ListaUsuariosController.activar);
router.patch("/suspender/:idUsuario",validarIdParam("idUsuario"), ListaUsuariosController.suspender);

export default router;
