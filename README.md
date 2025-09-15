# RediboBack

Repositorio para el desarrollo Back-end de la aplicación web RediBo. Este proyecto es desarrollado para la materia Ingeniería de Software con la docente Indira Camacho de la Universidad Mayor de San Simón.

## Tecnologías

- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **ORM**: Prisma
- **Gestor de paquetes**: PNPM
- **Base de datos**: PostgreSQL

## Requisitos previos

- Node.js
- PNPM (Debe ser instalado desde su página oficial)
- PostgreSQL

## Instalación

1. Clona este repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd RediboBack
   ```

2. Instala las dependencias:
   ```bash
   pnpm install
   ```

3. Configura las variables de entorno:
   - Crea un archivo `.env` en la raíz del proyecto
   - Agrega los campos del `.env.example` como base

4. Inicializa TypeScript:
   ```bash
   npx tsc --init
   ```

5. Inicializa Prisma:
   ```bash
   npx prisma init
   ```

6. Crea al menos un modelo en `prisma/schema.prisma`:
   ```prisma
   model Example {
     id Int @id @default(autoincrement())
   }
   ```

7. Genera el cliente de Prisma:
   ```bash
   pnpm prisma:generate
   ```

8. Crea las migraciones de la base de datos:
   ```bash
   pnpm prisma:migrate
   ```

## Scripts disponibles

- **dev**: Inicia el servidor de desarrollo con recarga automática
  ```bash
  pnpm dev
  ```

- **build**: Compila el proyecto TypeScript
  ```bash
  pnpm build
  ```

- **start**: Inicia la aplicación compilada en producción
  ```bash
  pnpm start
  ```

- **prisma:generate**: Genera el cliente de Prisma
  ```bash
  pnpm prisma:generate
  ```

- **prisma:migrate**: Crea y aplica migraciones de la base de datos
  ```bash
  pnpm prisma:migrate
  ```

- **prisma:studio**: Abre la interfaz de Prisma Studio para visualizar la base de datos
  ```bash
  pnpm prisma:studio
  ```