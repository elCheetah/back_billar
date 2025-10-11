// src/routes/mesas.routes.ts
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

/** POST /api/mesas/agregar  */
router.post('/agregar', validarCrearMesa, MesasController.crear);

/** GET /api/mesas/listar?localId=1  -> SIN paginación, devuelve todas */
router.get('/listar', validarListarMesas, MesasController.listarPorLocal);

/** GET /api/mesas/obtenerMesa/:id */
router.get('/obtenerMesa/:id', validarObtenerMesa, MesasController.obtener);

/** PATCH /api/mesas/modificarMesa/:id */
router.patch('/modificarMesa/:id', validarActualizarMesa, MesasController.actualizar);

/** DELETE /api/mesas/eliminarMesa/:id (soft delete -> estado=INACTIVO) */
router.delete('/eliminarMesa/:id', validarEliminarMesa, MesasController.eliminar);

export default router;
