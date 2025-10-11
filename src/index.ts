import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './config/database';
import authRoutes from './routes/auth.routes';
import registroPropietarioRoutes from './routes/registro-propietario.routes';
import registroClienteRoutes from './routes/registro-cliente.routes';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check principal
app.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // prueba rápida de conexión DB
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'not connected' });
  }
});

// Health check secundario (útil para monitoreo o Vercel)
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));


// Rutas públicas
app.use('/api/auth', authRoutes);
app.use('/api/registro', registroPropietarioRoutes);
app.use('/api/registro', registroClienteRoutes);


// Solo levantar servidor en entorno local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

export default app;
