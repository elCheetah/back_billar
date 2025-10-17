import { body } from 'express-validator';
import { validateRequest } from './validate.middleware';
import { REGEX_PASSWORD } from '../validators/expresiones';
import { esUrlGpsValida } from '../utils/gps';

const TIPOS_MESA = ['POOL', 'CARAMBOLA', 'SNOOKER', 'MIXTO'] as const;

const esDataUriImagen = (s: string) =>
  /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(s);

const esBase64Plano = (s: string) =>
  /^[A-Za-z0-9+/=]+$/.test(s) && s.length >= 100;

const tieneBase64OUrl = (img: any) => {
  if (!img || typeof img !== 'object') return false;
  const b64 = typeof img.base64 === 'string' && img.base64.trim() !== '';
  const url = typeof img.url_remota === 'string' && img.url_remota.trim() !== '';
  return b64 || url;
};

export const validarRegistroPropietario = [
  body('nombre').isString().trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('primer_apellido').isString().trim().notEmpty().withMessage('El primer apellido es obligatorio.'),
  body('segundo_apellido').optional({ nullable: true }).isString().trim(),
  body('correo').isString().trim().isEmail().withMessage('El correo no es válido.'),
  body('password')
    .isString()
    .matches(REGEX_PASSWORD)
    .withMessage('La contraseña debe tener 6+ caracteres, incluir mayúscula, minúscula, número y carácter especial.'),
  body('confirmar_password')
    .isString()
    .custom((v, { req }) => v === req.body.password)
    .withMessage('Las contraseñas no coinciden.'),
  body('celular')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 6, max: 20 })
    .withMessage('El celular no es válido.'),

  body('local').notEmpty().isObject().withMessage('El objeto local es obligatorio.'),
  body('local.nombre').isString().trim().isLength({ min: 2 }).withMessage('El nombre del local es obligatorio.'),
  body('local.direccion').isString().trim().isLength({ min: 3 }).withMessage('La dirección del local es obligatoria.'),
  body('local.ciudad').optional({ nullable: true }).isString().trim(),
  body('local.gps_url')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('La URL de GPS es obligatoria.')
    .bail()
    .custom((url) => esUrlGpsValida(url))
    .withMessage('La URL de GPS no contiene coordenadas válidas.'),

  body('local.imagenes').optional().isArray().withMessage('local.imagenes debe ser un arreglo.'),
  body('local.imagenes.*')
    .optional()
    .custom(tieneBase64OUrl)
    .withMessage('Cada imagen del local debe incluir base64 o url_remota.'),
  body('local.imagenes.*.base64')
    .optional()
    .isString()
    .bail()
    .custom((s) => esDataUriImagen(s) || esBase64Plano(s))
    .withMessage('base64 del local debe ser un data URI o base64 válido.'),
  body('local.imagenes.*.url_remota')
    .optional()
    .isString()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('url_remota del local debe ser una URL válida.'),

  body('mesas').isArray({ min: 1 }).withMessage('Debes registrar al menos una mesa.'),
  body('mesas.*.numero_mesa').isInt({ min: 1 }).withMessage('numero_mesa debe ser entero ≥ 1.'),
  body('mesas.*.tipo_mesa').isString().isIn(TIPOS_MESA).withMessage('tipo_mesa no es válido.'),
  body('mesas.*.descripcion').optional({ nullable: true }).isString().trim(),
  body('mesas.*.precio_hora').exists().withMessage('precio_hora es obligatorio.').bail().isFloat({ min: 0 }).withMessage('precio_hora debe ser un número ≥ 0.'),

  body('mesas.*.imagenes').optional().isArray().withMessage('Las imágenes de mesa deben venir en un arreglo.'),
  body('mesas.*.imagenes.*')
    .optional()
    .custom(tieneBase64OUrl)
    .withMessage('Cada imagen de mesa debe incluir base64 o url_remota.'),
  body('mesas.*.imagenes.*.base64')
    .optional()
    .isString()
    .bail()
    .custom((s) => esDataUriImagen(s) || esBase64Plano(s))
    .withMessage('base64 de mesa debe ser un data URI o base64 válido.'),
  body('mesas.*.imagenes.*.url_remota')
    .optional()
    .isString()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('url_remota de mesa debe ser una URL válida.'),

  body('mesas')
    .custom((mesas) => {
      const set = new Set<number>();
      for (const m of mesas || []) {
        if (set.has(m.numero_mesa)) return false;
        set.add(m.numero_mesa);
      }
      return true;
    })
    .withMessage('Hay números de mesa duplicados en la solicitud.'),

  validateRequest
];
