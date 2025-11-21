import { Router } from "express";
import { SolicitudesReservasController } from "../controllers/solicitudesReservas.controller";
import { validarIdReservaSolicitud } from "../middlewares/solicitudesReservas.middlewares";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/",
  requireAuth,
  SolicitudesReservasController.listarSolicitudes
);

router.patch(
  "/aceptar/:id_reserva",
  requireAuth,
  validarIdReservaSolicitud,
  SolicitudesReservasController.aceptarSolicitud
);

router.patch(
  "/rechazar/:id_reserva",
  requireAuth,
  validarIdReservaSolicitud,
  SolicitudesReservasController.rechazarSolicitud
);

export default router;
