// Genera un código con 3 números + 3 letras mayúsculas (ej: 418QZM)
export function generarCodigoReset(): string {
  const digits = '0123456789';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I/O para evitar confusión
  let nums = '';
  let lets = '';
  for (let i = 0; i < 3; i++) nums += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 3; i++) lets += letters[Math.floor(Math.random() * letters.length)];
  return (nums + lets).toUpperCase(); // 6 chars
}

export function normalizarCodigo(input: string): string {
  return (input || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}
