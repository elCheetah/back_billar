// src/routes/perfil.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { verMiPerfil, editarMiPerfil, actualizarMiFotoPerfil } from "../controllers/perfil.controller";
import { validarEditarPerfil, validarFotoPerfil } from "../middlewares/validarPerfil.middleware";

const router = Router();

// Ver mi perfil (cliente/propietario/admin) – datos mínimos y seguros
router.get("/", requireAuth, verMiPerfil);

// Editar mis datos (solo campos permitidos)
router.put("/", requireAuth, validarEditarPerfil, editarMiPerfil);

// Subir/actualizar mi foto de perfil (una sola, se guarda URL)
router.put("/foto", requireAuth, validarFotoPerfil, actualizarMiFotoPerfil);

export default router;
