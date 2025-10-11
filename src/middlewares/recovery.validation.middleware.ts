// src/middlewares/recovery.validation.middleware.ts
import { body } from 'express-validator';
import { validateRequest } from './validate.middleware';
import { REGEX_PASSWORD } from '../validators/expresiones';

export const validarEnviarCodigo = [
  body('correo').isEmail().withMessage('Debes enviar un correo válido.'),
  validateRequest
];

export const validarVerificarCodigo = [
  body('correo').isEmail(),
  body('codigo').isString().trim().isLength({ min: 6, max: 8 }), // aceptamos con o sin guión
  validateRequest
];

export const validarCambiarPassword = [
  body('correo').isEmail(),
  body('codigo').isString().trim().isLength({ min: 6, max: 8 }),
  body('password').isString().matches(REGEX_PASSWORD).withMessage(
    'La contraseña debe tener al menos 6 caracteres, con mayúscula, minúscula, número y símbolo.'
  ),
  body('confirmar_password').custom((v, { req }) => v === req.body.password).withMessage('Las contraseñas no coinciden.'),
  validateRequest
];
