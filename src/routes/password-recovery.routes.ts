// src/routes/password-recovery.routes.ts
import { Router } from 'express';
import { PasswordRecoveryController } from '../controllers/password-recovery.controller';
import {
  validarEnviarCodigo,
  validarVerificarCodigo,
  validarCambiarPassword
} from '../middlewares/recovery.validation.middleware';

const router = Router();

/**
 * POST /api/auth/recovery/enviar-codigo
 * body: { correo }
 */
router.post('/enviar-codigo', validarEnviarCodigo, PasswordRecoveryController.enviarCodigo);

/**
 * POST /api/auth/recovery/verificar-codigo
 * body: { correo, codigo }
 */
router.post('/verificar-codigo', validarVerificarCodigo, PasswordRecoveryController.verificarCodigo);

/**
 * POST /api/auth/recovery/cambiar-password
 * headers: { "x-reset-token": "<token-del-paso-2>" }
 * body: { correo, codigo, password, confirmar_password }
 */
router.post('/cambiar-password', validarCambiarPassword, PasswordRecoveryController.cambiarPassword);

export default router;
