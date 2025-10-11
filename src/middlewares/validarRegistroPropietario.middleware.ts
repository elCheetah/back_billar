// src/middlewares/validarRegistroPropietario.middleware.ts
import { body } from 'express-validator';
import { validateRequest } from './validate.middleware';
import { REGEX_PASSWORD } from '../validators/expresiones';
import { esUrlGpsValida } from '../utils/gps';

const TIPOS_MESA = ['POOL', 'CARAMBOLA', 'SNOOKER', 'MIXTO'] as const;

// Helper: valida si un string parece ser un data URI de imagen o base64 plausible
const esDataUriImagen = (s: string) =>
  /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(s);

// Nota: permitimos también “base64 plano” (sin data URI) si luce como base64
const esBase64Plano = (s: string) =>
  /^[A-Za-z0-9+/=]+$/.test(s) && s.length >= 100; // umbral mínimo razonable

// Valida que cada elemento del arreglo de imágenes tenga al menos base64 o url_remota
const tieneBase64OUrl = (img: any) => {
  if (!img || typeof img !== 'object') return false;
  const b64 = typeof img.base64 === 'string' && img.base64.trim() !== '';
  const url = typeof img.url_remota === 'string' && img.url_remota.trim() !== '';
  return b64 || url;
};

export const validarRegistroPropietario = [
  // ===== Datos de usuario =====
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

  // ===== Datos del local =====
  body('local').notEmpty().isObject().withMessage('El campo local es obligatorio.'),
  body('local.nombre').isString().trim().isLength({ min: 2 }).withMessage('El nombre del local es obligatorio.'),
  body('local.direccion').isString().trim().isLength({ min: 3 }).withMessage('La dirección del local es obligatoria.'),
  body('local.ciudad').optional({ nullable: true }).isString().trim(),

  // URL GPS (de aquí extraerás lat/long en el service)
  body('local.gps_url')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('La URL del GPS es obligatoria.')
    .bail()
    .custom((url) => esUrlGpsValida(url))
    .withMessage('La URL de GPS no contiene coordenadas válidas.'),

  // ===== Imágenes del local (opcionales) =====
  body('local.imagenes').optional().isArray().withMessage('local.imagenes debe ser un arreglo.'),
  // Cada ítem debe tener base64 o url_remota
  body('local.imagenes.*')
    .optional()
    .custom(tieneBase64OUrl)
    .withMessage('Cada imagen del local debe incluir base64 o url_remota.'),
  // Si incluye base64, que sea data URI de imagen o base64 plausible
  body('local.imagenes.*.base64')
    .optional()
    .isString()
    .bail()
    .custom((s) => esDataUriImagen(s) || esBase64Plano(s))
    .withMessage('El campo base64 debe ser un data URI de imagen válido o base64.'),
  // Si incluye url_remota, que sea URL http(s) válida
  body('local.imagenes.*.url_remota')
    .optional()
    .isString()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('url_remota debe ser una URL válida.'),

  // ===== Mesas (mínimo 1) =====
  body('mesas').isArray({ min: 1 }).withMessage('Debes registrar al menos 1 mesa.'),
  body('mesas.*.numero_mesa').isInt({ min: 1 }).withMessage('El número de mesa debe ser entero >= 1.'),
  body('mesas.*.tipo_mesa').isString().isIn(TIPOS_MESA).withMessage('El tipo de mesa es inválido.'),
  body('mesas.*.descripcion').optional({ nullable: true }).isString().trim(),

  // Imágenes por mesa (opcionales)
  body('mesas.*.imagenes').optional().isArray().withMessage('Las imágenes de la mesa deben venir en un arreglo.'),
  body('mesas.*.imagenes.*')
    .optional()
    .custom(tieneBase64OUrl)
    .withMessage('Cada imagen de mesa debe incluir base64 o url_remota.'),
  body('mesas.*.imagenes.*.base64')
    .optional()
    .isString()
    .bail()
    .custom((s) => esDataUriImagen(s) || esBase64Plano(s))
    .withMessage('El campo base64 (mesa) debe ser un data URI de imagen válido o base64.'),
  body('mesas.*.imagenes.*.url_remota')
    .optional()
    .isString()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('url_remota (mesa) debe ser una URL válida.'),

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
