import { param,  } from "express-validator";



// Mantén estos nombres porque así los importas en las rutas
export const validarIdLocal = [
  param("idLocal").isInt({ min: 1 }).withMessage("idLocal inválido."),
  
];

export const validarIdMesa = [
  param("idMesa").isInt({ min: 1 }).withMessage("idMesa inválido."),
  
];
