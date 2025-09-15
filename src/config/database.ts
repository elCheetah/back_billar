/*
Vista rápida del funcionamiento y contenido de esta carpeta

    Archivos de configuración del proyecto
        - Conexión a la base de datos
        - Configuración de variables de entorno, servicios externos y/o opciones del servidor
*/

// El error sale porque Prisma no generará un cliente si no hay modelos definidos
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Conexión a la database
prisma.$connect()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error: any) => {
    console.error('Database connection error:', error);
    process.exit(1);
  });

export default prisma;