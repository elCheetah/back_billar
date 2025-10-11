export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'production',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? '2h', // por defecto 2 horas
};

if (!ENV.JWT_SECRET) {
  // Fallar temprano en build/arranque (útil en Vercel si falta el env)
  throw new Error('JWT_SECRET no está definido en variables de entorno');
}

