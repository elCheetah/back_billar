import { body } from 'express-validator';
import { REGEX_PASSWORD } from '../validators/expresiones';
import { validateRequest } from './validate.middleware';

/**
 * Middleware: valida todos los campos del registro de propietario
 * (sólo estructura, formato y contraseñas)
 */
export const validarRegistroPropietario = [
  body('nombre')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.'),

  body('primer_apellido')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('El primer apellido es obligatorio.'),

  body('segundo_apellido')
    .optional({ nullable: true })
    .isString()
    .trim(),

  body('correo')
    .isString()
    .trim()
    .isEmail()
    .withMessage('El correo no es válido.'),

  body('password')
    .isString()
    .matches(REGEX_PASSWORD)
    .withMessage(
      'La contraseña debe tener al menos 6 caracteres, incluir 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.'
    ),

  body('confirmar_password')
    .isString()
    .custom((v, { req }) => v === req.body.password)
    .withMessage('Las contraseñas no coinciden.'),

  body('celular')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 6, max: 20 })
    .withMessage('El número de celular no es válido.'),

  body('local')
    .notEmpty()
    .isObject()
    .withMessage('El campo local es obligatorio.'),

  body('local.nombre')
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre del local es obligatorio.'),

  body('local.direccion')
    .isString()
    .trim()
    .isLength({ min: 3 })
    .withMessage('La dirección del local es obligatoria.'),

  body('local.tipo_billar')
    .isString()
    .isIn(['POOL', 'CARAMBOLA', 'SNOOKER', 'MIXTO'])
    .withMessage('El tipo de billar es inválido.'),

  // imágenes opcionales
  body('local.imagenes')
    .optional()
    .isArray()
    .withMessage('El campo local.imagenes debe ser un arreglo.'),

  body('mesas')
    .optional()
    .isArray()
    .withMessage('El campo mesas debe ser un arreglo.'),

  body('mesas.*.numero_mesa')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El número de mesa debe ser entero >= 1.'),

  body('mesas.*.descripcion')
    .optional({ nullable: true })
    .isString(),

  validateRequest
];
