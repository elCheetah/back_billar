import { Router } from 'express';
import { validarRegistroPropietario } from '../middlewares/validarRegistroPropietario.middleware';
import { RegistroPropietarioController } from '../controllers/registro-propietario.controller';

const router = Router();

// POST /api/registro/propietario
router.post('/propietario', validarRegistroPropietario, RegistroPropietarioController.crear);

export default router;
