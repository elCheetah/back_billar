// src/routes/horarios.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { esPropietarioDelLocal } from "../middlewares/esPropietario.middleware";
import { validarGuardarParcialBody, validarEditarTurnoBody } from "../middlewares/validarHorario.middleware";
import {
  listarHorariosPropietario, listarHorariosPublico,
  guardarParcialController, editarTurnoController,
  eliminarTurnoController, cambiarEstadoTurnoController,
} from "../controllers/horarios.controller";

const router = Router();

/**
 * PROPIETARIO / ADMIN
 * Base: /api/horarios/local/:idLocal
 */
router.get("/:idLocal", requireAuth, esPropietarioDelLocal, listarHorariosPropietario);
/** Guardar 1..N días (reemplaza los días enviados; los demás no se tocan) */
router.put("/:idLocal", requireAuth, esPropietarioDelLocal, validarGuardarParcialBody, guardarParcialController);
/** Editar un turno concreto (horas y/o estado) */
router.patch("/:idLocal/:idHorario", requireAuth, esPropietarioDelLocal, validarEditarTurnoBody, editarTurnoController);
/** Eliminar un turno por id */
router.delete("/:idLocal/:idHorario", requireAuth, esPropietarioDelLocal, eliminarTurnoController);
/** Toggle rápido de estado (para el switch) */
router.patch("/:idLocal/:idHorario/estado", requireAuth, esPropietarioDelLocal, cambiarEstadoTurnoController);

/**
 * PÚBLICO / CLIENTE
 * Base: /api/horarios/local/publico/:idLocal
 * Devuelve solo activos y solo días con al menos un turno.
 */
router.get("/publico/:idLocal", listarHorariosPublico);

export default router;
