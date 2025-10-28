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

router.get("/", requireAuth, verMiPerfil);
router.put("/", requireAuth, validarEditarPerfil, editarMiPerfil);
router.put("/foto", requireAuth, validarFotoPerfil, actualizarMiFotoPerfil);
router.delete("/foto", requireAuth, eliminarMiFotoPerfil);

export default router;
