import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { requireRol } from '../middlewares/require-role.middleware';
import {
    validarCrearMesa,
    validarActualizarMesa,
    validarEliminarMesa,
    validarListarMesas,
    validarObtenerMesa
} from '../middlewares/mesas.validation.middleware';
import { MesasController } from '../controllers/mesas.controller';

const router = Router();

// Todas requieren propietario autenticado
router.use(auth, requireRol('PROPIETARIO'));

/** POST /api/mesas  */
router.post('/', validarCrearMesa, MesasController.crear);

/** GET /api/mesas?localId=1&page=1&pageSize=10 */
router.get('/', validarListarMesas, MesasController.listarPorLocal);

/** GET /api/mesas/:id */
router.get('/:id', validarObtenerMesa, MesasController.obtener);

/** PATCH /api/mesas/:id */
router.patch('/:id', validarActualizarMesa, MesasController.actualizar);

/** DELETE /api/mesas/:id (soft delete -> estado=INACTIVO) */
router.delete('/:id', validarEliminarMesa, MesasController.eliminar);

export default router;
