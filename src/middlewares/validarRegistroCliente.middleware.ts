import { body } from 'express-validator';
import { validateRequest } from './validate.middleware';
import { REGEX_PASSWORD } from '../validators/expresiones';

/**
 * Middleware: valida la estructura y formato de los campos de registro del cliente.
 */
export const validarRegistroCliente = [
  body('nombre')
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre es obligatorio y debe tener al menos 2 caracteres.'),

  body('primer_apellido')
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('El primer apellido es obligatorio y debe tener al menos 2 caracteres.'),

  body('segundo_apellido')
    .optional({ nullable: true })
    .isString()
    .trim(),

  body('correo')
    .isString()
    .trim()
    .isEmail()
    .withMessage('El correo no tiene un formato válido.'),

  body('password')
    .isString()
    .matches(REGEX_PASSWORD)
    .withMessage(
      'La contraseña debe tener al menos 6 caracteres, incluir 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial, y no contener espacios.'
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

  validateRequest
];
