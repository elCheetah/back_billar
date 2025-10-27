import { body } from "express-validator";
import { validateRequest } from "./validate.middleware";
import { parseGpsFromUrl } from "../utils/gps";

// valida data URI base64
const isBase64DataURI = (v: unknown) =>
  typeof v === "string" && /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(v.trim());

const validarArregloImagenesBase64 = (campo: string) => [
  body(campo).optional().isArray().withMessage(`${campo} debe ser un arreglo.`),
  body(`${campo}.*`)
    .optional()
    .custom((item) => {
      if (typeof item === "string") return isBase64DataURI(item);
      if (typeof item === "object" && item && "base64" in item) return isBase64DataURI((item as any).base64);
      return false;
    })
    .withMessage("Cada imagen debe venir como base64 (data URI)."),
];

export const validarObtenerDatosLocal = [
  // sin params/body
  validateRequest,
];

export const validarActualizarDatosLocal = [
  body("nombre").optional().isString().trim().isLength({ min: 1, max: 150 })
    .withMessage("nombre inválido."),
  body("direccion").optional().isString().trim().isLength({ min: 1, max: 255 })
    .withMessage("direccion inválida."),
  body("ciudad").optional().isString().trim().isLength({ min: 1, max: 100 })
    .withMessage("ciudad inválida."),

  // Ubicación: SOLO gps_url (si viene, debe contener coords válidas)
  body("gps_url").optional().isString().trim().custom((url) => {
    const coords = parseGpsFromUrl(url);
    if (!coords) throw new Error("gps_url no contiene coordenadas válidas.");
    return true;
  }),

  // Imágenes: SOLO base64
  ...validarArregloImagenesBase64("agregar_imagenes"),

  body("eliminar_imagen_ids").optional().isArray().withMessage("eliminar_imagen_ids debe ser un arreglo."),
  body("eliminar_imagen_ids.*").optional().isInt({ min: 1 }).withMessage("id de imagen inválido."),

  validateRequest,
];
