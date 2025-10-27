import { Router } from "express";
import { auth } from "../middlewares/auth.middleware";
import { requireRol } from "../middlewares/require-role.middleware";
import { MesasController } from "../controllers/mesas.controller";

const router = Router();

router.use(auth, requireRol("PROPIETARIO"));

router.post("/agregar", MesasController.crear);
router.get("/listar", MesasController.listarPorUsuario);
router.patch("/modificar/:id", MesasController.actualizar);
router.patch("/cambiarEstado/:id", MesasController.cambiarEstado);
router.delete("/eliminar/:id", MesasController.eliminar);

export default router;
