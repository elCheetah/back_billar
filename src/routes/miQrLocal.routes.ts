// src/routes/miQrLocal.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { verMiQr, actualizarQr, eliminarQr } from "../controllers/miQrLocal.controller";
import { validarQrLocal } from "../middlewares/validarQrLocal.middleware";

/**
 * Rutas del QR del local del propietario autenticado.
 * GET    /api/local/qr        -> ver QR actual (url o null)
 * PUT    /api/local/qr        -> subir/actualizar (body: { base64? | url_remota? })
 * DELETE /api/local/qr        -> eliminar (deja null)
 */
const router = Router();

router.get("/qr", requireAuth, verMiQr);
router.put("/qr", requireAuth, validarQrLocal, actualizarQr);
router.delete("/qr", requireAuth, eliminarQr);

export default router;
