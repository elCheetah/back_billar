import dotenv from 'dotenv';
dotenv.config();

const toInt = (v: any, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'production',
  PORT: toInt(process.env.PORT, 3000),
  DATABASE_URL: process.env.DATABASE_URL ?? '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? '2h',

  // RESET PASSWORD JWT (token corto embebido en link)
  RESET_JWT_SECRET: process.env.RESET_JWT_SECRET ?? '',
  RESET_JWT_EXPIRES: process.env.RESET_JWT_EXPIRES ?? '7m',

  // Código (6 chars: 3 números + 3 letras) – caducidad en minutos
  RESET_CODE_EXPIRES_MIN: toInt(process.env.RESET_CODE_EXPIRES_MIN, 5),

  // CLOUDINARY
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER ?? 'billar',

  // EMAIL (elige Resend **o** SMTP)
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',

  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: toInt(process.env.SMTP_PORT, 587),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  MAIL_FROM: process.env.MAIL_FROM ?? 'Soporte <no-reply@example.com>',
} as const;

// Validaciones mínimas
if (!ENV.JWT_SECRET) throw new Error('❌ JWT_SECRET no está definido');
if (!ENV.RESET_JWT_SECRET) throw new Error('❌ RESET_JWT_SECRET no está definido');

if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
  throw new Error('❌ Cloudinary no está configurado (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).');
}
