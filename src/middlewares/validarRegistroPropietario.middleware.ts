import { body } from 'express-validator';
import { validateRequest } from './validate.middleware';
import { REGEX_PASSWORD } from '../validators/expresiones';
import { esUrlGpsValida } from '../utils/gps';

const TIPOS_MESA = ['POOL', 'CARAMBOLA', 'SNOOKER', 'MIXTO'] as const;

export const validarRegistroPropietario = [
  // Datos de usuario
  body('nombre').isString().trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('primer_apellido').isString().trim().notEmpty().withMessage('El primer apellido es obligatorio.'),
  body('segundo_apellido').optional({ nullable: true }).isString().trim(),
  body('correo').isString().trim().isEmail().withMessage('El correo no es válido.'),
  body('password')
    .isString()
    .matches(REGEX_PASSWORD)
    .withMessage(
      'La contraseña debe tener al menos 6 caracteres, incluir 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial y no contener espacios.'
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

  // Datos del local
  body('local').notEmpty().isObject().withMessage('El campo local es obligatorio.'),
  body('local.nombre').isString().trim().isLength({ min: 2 }).withMessage('El nombre del local es obligatorio.'),
  body('local.direccion').isString().trim().isLength({ min: 3 }).withMessage('La dirección del local es obligatoria.'),
  body('local.ciudad').optional({ nullable: true }).isString().trim(),
  body('local.gps_url')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('La URL del GPS es obligatoria.')
    .bail()
    .custom((url) => esUrlGpsValida(url))
    .withMessage('La URL de GPS no contiene coordenadas válidas.'),

  // Imágenes del local (opcionales)
  body('local.imagenes').optional().isArray().withMessage('local.imagenes debe ser un arreglo.'),
  body('local.imagenes.*')
    .optional()
    .custom((img) => {
      if (!img) return false;
      if (typeof img !== 'object') return false;
      return Boolean(img.base64 || img.url_remota);
    })
    .withMessage('Cada imagen del local debe tener base64 o url_remota.'),

  // Mesas (mínimo 1)
  body('mesas').isArray({ min: 1 }).withMessage('Debes registrar al menos 1 mesa.'),
  body('mesas.*.numero_mesa').isInt({ min: 1 }).withMessage('El número de mesa debe ser entero >= 1.'),
  body('mesas.*.tipo_mesa')
    .isString()
    .isIn(TIPOS_MESA)
    .withMessage('El tipo de mesa es inválido.'),
  body('mesas.*.descripcion').optional({ nullable: true }).isString().trim(),
  body('mesas.*.imagenes').optional().isArray().withMessage('Las imágenes de la mesa deben venir en un arreglo.'),
  body('mesas.*.imagenes.*')
    .optional()
    .custom((img) => {
      if (!img) return false;
      if (typeof img !== 'object') return false;
      return Boolean(img.base64 || img.url_remota);
    })
    .withMessage('Cada imagen de mesa debe tener base64 o url_remota.'),

  // Sin números de mesa duplicados en la misma petición
  body('mesas')
    .custom((mesas) => {
      const set = new Set<number>();
      for (const m of mesas || []) {
        if (set.has(m.numero_mesa)) return false;
        set.add(m.numero_mesa);
      }
      return true;
    })
    .withMessage('Existen números de mesa duplicados.'),

  validateRequest
];
