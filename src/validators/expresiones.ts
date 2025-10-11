// Mínimo 6, al menos 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial, sin espacios.
export const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[\S]{6,}$/;
