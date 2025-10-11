import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'production',
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL: process.env.DATABASE_URL ?? '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? '2h',

  // CLOUDINARY
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER ?? 'billar'
};

// ✅ Validar que no falte JWT_SECRET en ejecución
if (!ENV.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET no está definido en las variables de entorno');
}

// ✅ Validar que Cloudinary esté configurado correctamente
if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
  throw new Error('❌ Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en tu entorno.');
}
