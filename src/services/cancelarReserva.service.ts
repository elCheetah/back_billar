// src/services/cancelarReserva.service.ts
import prisma from "../config/database";
import { Prisma, EstadoReserva } from "@prisma/client";
import {
  subirImagenACloudinary,
  eliminarImagenesCloudinary,
} from "../utils/cloudinary";
import { enviarCorreoHTML } from "../utils/mailer";
import { reservationCancelledEmailHTML } from "../templates/estado-email";

type CancelarReservaInput = {
  id_reserva: number;
  monto_penalizacion_aplicada: number;
  qr_base64: string;
};

export async function cancelarReservaService(input: CancelarReservaInput) {
  const { id_reserva, monto_penalizacion_aplicada, qr_base64 } = input;

  const reserva = await prisma.reserva.findUnique({
    where: { id_reserva },
    include: {
      usuario: true,
      mesa: {
        include: {
          local: {
            include: {
              admin: true,
            },
          },
        },
      },
      pago: true,
    },
  });

  if (!reserva) {
    throw new Error("RESERVA_NO_ENCONTRADA: La reserva no existe.");
  }

  if (
    reserva.estado_reserva === EstadoReserva.CANCELADA ||
    reserva.estado_reserva === EstadoReserva.FINALIZADA
  ) {
    throw new Error(
      "RESERVA_NO_CANCELABLE: La reserva ya está cancelada o finalizada."
    );
  }

  if (!reserva.pago) {
    throw new Error(
      "PAGO_NO_ENCONTRADO: La reserva no tiene un pago asociado."
    );
  }

  const cliente = reserva.usuario;
  const mesa = reserva.mesa;
  const local = mesa.local;
  const adminLocal = local.admin;
  const pago = reserva.pago;

  let publicIdQR: string | null = null;

  try {
    const imagenQR = await subirImagenACloudinary(
      { base64: qr_base64, url_remota: null },
      `reembolsos/reserva-${id_reserva}`
    );
    publicIdQR = imagenQR.public_id;

    const montoDecimal = new Prisma.Decimal(monto_penalizacion_aplicada);

    const [reservaActualizada, pagoActualizado] = await prisma.$transaction([
      prisma.reserva.update({
        where: { id_reserva },
        data: {
          estado_reserva: EstadoReserva.CANCELADA,
          monto_penalizacion_aplicada: montoDecimal,
        },
      }),
      prisma.pago.update({
        where: { id_pago: pago.id_pago },
        data: {
          qr_para_reembolso: imagenQR.url,
        },
      }),
    ]);

    if (cliente.correo) {
      const html = reservationCancelledEmailHTML({
        nombreCliente: `${cliente.nombre} ${
          cliente.primer_apellido ?? ""
        }`.trim(),
        nombreLocal: local.nombre,
        celularPropietario: adminLocal.celular ?? "",
        montoPenalizacion: montoDecimal.toNumber(),
      });

      await enviarCorreoHTML(
        cliente.correo,
        "BilliAR • Cancelación de reserva y proceso de reembolso",
        html
      );
    }

    return {
      reserva: reservaActualizada,
      pago: pagoActualizado,
    };
  } catch (error) {
    if (publicIdQR) {
      await eliminarImagenesCloudinary([publicIdQR]).catch(() => undefined);
    }
    throw error;
  }
}
