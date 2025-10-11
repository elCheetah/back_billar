import { body, param, query } from 'express-validator';
import { validateRequest } from './validate.middleware';

const TIPOS_MESA = ['POOL', 'CARAMBOLA', 'SNOOKER', 'MIXTO'] as const;

export const validarCrearMesa = [
  body('localId').isInt({ min: 1 }).withMessage('localId es obligatorio y debe ser entero.'),
  body('numero_mesa').isInt({ min: 1 }).withMessage('numero_mesa debe ser entero >= 1.'),
  body('tipo_mesa').isString().isIn(TIPOS_MESA).withMessage('tipo_mesa no es válido.'),
  body('descripcion').optional({ nullable: true }).isString().trim(),
  body('imagenes').optional().isArray().withMessage('imagenes debe ser un arreglo.'),
  body('imagenes.*')
    .optional()
    .custom((img) => {
      if (!img || typeof img !== 'object') return false;
      return Boolean(img.base64 || img.url_remota);
    })
    .withMessage('Cada imagen debe tener base64 o url_remota.'),
  validateRequest
];

export const validarActualizarMesa = [
  param('id').isInt({ min: 1 }).withMessage('Id de mesa inválido.'),
  body('numero_mesa').optional().isInt({ min: 1 }).withMessage('numero_mesa debe ser entero >= 1.'),
  body('tipo_mesa').optional().isString().isIn(TIPOS_MESA).withMessage('tipo_mesa inválido.'),
  body('descripcion').optional({ nullable: true }).isString().trim(),
  body('agregar_imagenes').optional().isArray().withMessage('agregar_imagenes debe ser un arreglo.'),
  body('agregar_imagenes.*')
    .optional()
    .custom((img) => {
      if (!img || typeof img !== 'object') return false;
      return Boolean(img.base64 || img.url_remota);
    })
    .withMessage('Cada imagen a agregar requiere base64 o url_remota.'),
  body('eliminar_imagen_ids').optional().isArray().withMessage('eliminar_imagen_ids debe ser un arreglo de enteros.'),
  body('eliminar_imagen_ids.*').optional().isInt({ min: 1 }),
  validateRequest
];

export const validarEliminarMesa = [
  param('id').isInt({ min: 1 }).withMessage('Id de mesa inválido.'),
  validateRequest
];

export const validarListarMesas = [
  query('localId').isInt({ min: 1 }).withMessage('localId es obligatorio y debe ser entero.'),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  validateRequest
];

export const validarObtenerMesa = [
  param('id').isInt({ min: 1 }).withMessage('Id de mesa inválido.'),
  validateRequest
];
