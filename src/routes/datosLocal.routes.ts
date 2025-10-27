import { Router } from "express";
import { auth } from "../middlewares/auth.middleware";
import { requireRol } from "../middlewares/require-role.middleware";
import { DatosLocalController } from "../controllers/datosLocal.controller";
import {
  validarObtenerDatosLocal,
  validarActualizarDatosLocal,
} from "../middlewares/datosLocal.middleware";

const router = Router();

router.use(auth, requireRol("PROPIETARIO"));

// Solo mostrar y editar
router.get("/datos", validarObtenerDatosLocal, DatosLocalController.obtener);
router.put("/editar", validarActualizarDatosLocal, DatosLocalController.actualizar);

export default router;
