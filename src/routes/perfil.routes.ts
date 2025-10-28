import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  verMiPerfil,
  editarMiPerfil,
  actualizarMiFotoPerfil,
  eliminarMiFotoPerfil,
} from "../controllers/perfil.controller";
import { validarEditarPerfil, validarFotoPerfil } from "../middlewares/validarPerfil.middleware";

const router = Router();

// Ver perfil (con datos y fecha de creación)
router.get("/", requireAuth, verMiPerfil);

// Editar nombre/apellidos/celular
router.put("/", requireAuth, validarEditarPerfil, editarMiPerfil);

// Subir o reemplazar foto
router.put("/foto", requireAuth, validarFotoPerfil, actualizarMiFotoPerfil);

// Eliminar foto existente
router.delete("/foto", requireAuth, eliminarMiFotoPerfil);

export default router;
