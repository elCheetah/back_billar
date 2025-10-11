import { Router } from 'express';
import { validarRegistroPropietario } from '../middlewares/validarRegistroPropietario.middleware';
import { RegistroPropietarioController } from '../controllers/registro-propietario.controller';

const router = Router();

/**
 * POST /api/registro/propietario
 * Registra un propietario con local, mesas e imágenes.
 */
router.post('/propietario', validarRegistroPropietario, RegistroPropietarioController.crear);

export default router;
