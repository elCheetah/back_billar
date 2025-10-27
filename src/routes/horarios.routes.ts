import { Router } from "express";
import { auth } from "../middlewares/auth.middleware";
import { HorariosController } from "../controllers/horarios.controller";
import { validarGuardarDiaBody, validarEstadoBody } from "../middlewares/validarHorario.middleware";

const router = Router();

// Todas con token. El local se resuelve 1:1 por usuario logueado.
router.use(auth);

// Listar (activos + inactivos por defecto; ?activos=true para solo activos)
router.get("/", HorariosController.listar);

// Botón Guardar por día (reemplaza todo el día con los turnos recibidos)
router.put("/dia/:dia_semana", validarGuardarDiaBody, HorariosController.guardarDia);

// Cambiar estado de un turno (independiente)
router.patch("/turno/:idHorario/estado", validarEstadoBody, HorariosController.cambiarEstado);

// Eliminar turno (independiente)
router.delete("/turno/:idHorario", HorariosController.eliminarTurno);

export default router;
