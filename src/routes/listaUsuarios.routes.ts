// src/routes/listaUsuarios.routes.ts
import { Router } from "express";
import { ListaUsuariosController } from "../controllers/listaUsuarios.controller";

const router = Router();

router.get("/propietarios", ListaUsuariosController.propietarios);
router.get("/clientes", ListaUsuariosController.clientes);
router.patch("/activar/:idUsuario", ListaUsuariosController.activar);
router.patch("/suspender/:idUsuario", ListaUsuariosController.suspender);

export default router;
