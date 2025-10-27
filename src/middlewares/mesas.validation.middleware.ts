import { body, param } from "express-validator";
import { validateRequest } from "./validate.middleware";

const TIPOS_MESA = ["POOL", "CARAMBOLA", "SNOOKER", "MIXTO"] as const;

// Valida que sea dataURI base64: data:image/<tipo>;base64,<...>
const isBase64DataURI = (v: unknown) =>
  typeof v === "string" && /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(v.trim());

// Acepta array de strings base64 o array de objetos { base64: string }
const validarArregloImagenesBase64 = (campo: string) => [
  body(campo).optional().isArray().withMessage(`${campo} debe ser un arreglo.`),
  body(`${campo}.*`)
    .optional()
    .custom((item) => {
      if (typeof item === "string") return isBase64DataURI(item);
      if (typeof item === "object" && item && "base64" in item) return isBase64DataURI((item as any).base64);
      return false;
    })
    .withMessage("Cada imagen debe venir como base64 (dataURI)."),
];

export const validarCrearMesa = [
  body("numero_mesa").isInt({ min: 1 }).withMessage("numero_mesa debe ser entero ≥ 1."),
  body("tipo_mesa").isString().isIn(TIPOS_MESA as unknown as string[]).withMessage("tipo_mesa inválido."),
  body("precio_hora").exists().withMessage("precio_hora es obligatorio.").bail()
    .isFloat({ min: 0 }).withMessage("precio_hora debe ser un número ≥ 0."),
  body("descripcion").optional({ nullable: true }).isString().trim(),
  ...validarArregloImagenesBase64("imagenes"),
  validateRequest,
];

export const validarActualizarMesa = [
  param("id").isInt({ min: 1 }).withMessage("Id de mesa inválido."),
  body("numero_mesa").optional().isInt({ min: 1 }).withMessage("numero_mesa debe ser entero ≥ 1."),
  body("tipo_mesa").optional().isString().isIn(TIPOS_MESA as unknown as string[]).withMessage("tipo_mesa inválido."),
  body("precio_hora").optional().isFloat({ min: 0 }).withMessage("precio_hora debe ser un número ≥ 0."),
  body("descripcion").optional({ nullable: true }).isString().trim(),
  ...validarArregloImagenesBase64("agregar_imagenes"),
  body("eliminar_imagen_ids").optional().isArray().withMessage("eliminar_imagen_ids debe ser un arreglo de enteros."),
  body("eliminar_imagen_ids.*").optional().isInt({ min: 1 }),
  validateRequest,
];

export const validarCambiarEstado = [
  param("id").isInt({ min: 1 }).withMessage("Id de mesa inválido."),
  body("nuevoEstado").isString().isIn(["DISPONIBLE", "OCUPADO", "MANTENIMIENTO", "INACTIVO"])
    .withMessage("nuevoEstado inválido."),
  validateRequest,
];

export const validarEliminarMesa = [
  param("id").isInt({ min: 1 }).withMessage("Id de mesa inválido."),
  validateRequest,
];
