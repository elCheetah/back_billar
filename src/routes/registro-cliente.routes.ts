import { Router } from 'express';
import { validarRegistroCliente } from '../middlewares/validarRegistroCliente.middleware';
import { RegistroClienteController } from '../controllers/registro-cliente.controller';

const router = Router();

/**
 * POST /api/registro/cliente
 * Crea un nuevo usuario con rol CLIENTE.
 */
router.post('/cliente', validarRegistroCliente, RegistroClienteController.crear);

export default router;
