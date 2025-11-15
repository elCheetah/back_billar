// src/app.ts  (o tu archivo principal del server)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prisma from './config/database';
import compression from "compression";
import { subirImagenACloudinary } from './utils/cloudinary';

import authRoutes from './routes/auth.routes';
import passwordRecoveryRoutes from './routes/password-recovery.routes';

import registroPropietarioRoutes from './routes/registro-propietario.routes';
import registroClienteRoutes from './routes/registro-cliente.routes';
import mesasRoutes from './routes/mesas.routes';
import horariosRoutes from "./routes/horarios.routes";
import historialReservasRoutes from "./routes/historialReservas.routes";
import perfilRoutes from "./routes/perfil.routes";
import filtroLocalesRoutes from "./routes/filtroLocales.routes";
import miQrLocalRoutes from "./routes/miQrLocal.routes";
import miDescuentoLocalRoutes from "./routes/miDescuentoLocal.routes";
import datosLocal from "./routes/datosLocal.routes";
import mesaDetalle from "./routes/mesaDetalle.routes";
import horariosDisponiblesRoutes from "./routes/horasDisponibles.routes";
import listaUsuariosRoutes from "./routes/listaUsuarios.routes";
import listaLocalesRoutes from "./routes/listaLocales.routes";
import dashboardAdmin from "./routes/dashboardAdmin.routes";
import dashboardPropietario from "./routes/dashboardPropietario.routes";
import reservarRoutes from "./routes/reservar.routes";


const app = express();

// ====== Límite de body definido======
const BODY_LIMIT = '10mb';

// Middlewares
app.use(cors());
app.use(helmet());

// Aumenta el tamaño máximo permitido para JSON y x-www-form-urlencoded
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use(compression());

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

// Probar subida de imagen a Cloudinary
app.post('/api/test/cloudinary', async (req, res) => {
  try {
    const { base64 } = req.body;
    const result = await subirImagenACloudinary({ base64 }, 'pruebas');
    res.json({ ok: true, result });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Rutas públicas
app.use('/api/auth', authRoutes);
app.use('/api/auth/recovery', passwordRecoveryRoutes);
app.use('/api/registro', registroPropietarioRoutes);
app.use('/api/registro', registroClienteRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/mesa', horariosDisponiblesRoutes);
app.use("/api/horarios/local", horariosRoutes);
app.use("/api/reservas", historialReservasRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/locales", filtroLocalesRoutes);
app.use("/api/local", miQrLocalRoutes);
app.use("/api/local", miDescuentoLocalRoutes);
app.use("/api/local", datosLocal);
app.use("/api/mesasLocal", mesaDetalle);
app.use("/api/listaUsuarios", listaUsuariosRoutes);
app.use("/api/listaLocales", listaLocalesRoutes);
app.use("/api/dashboardAdmin", dashboardAdmin);
app.use("/api/dashboardPropietario", dashboardPropietario);
app.use("/api/reservar", reservarRoutes);


// Solo levantar servidor en entorno local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT} (body limit: ${BODY_LIMIT})`);
  });
}

export default app;
