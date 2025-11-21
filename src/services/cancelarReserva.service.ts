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

  // 1) Buscar reserva con relaciones necesarias
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
    return {
      ok: false,
      statusCode: 404,
      mensaje: "La reserva no existe.",
      codigo: "RESERVA_NO_ENCONTRADA",
    };
  }

  if (
    reserva.estado_reserva === EstadoReserva.CANCELADA ||
    reserva.estado_reserva === EstadoReserva.FINALIZADA
  ) {
    return {
      ok: false,
      statusCode: 409,
      mensaje:
        "La reserva ya no puede ser cancelada (ya está cancelada o finalizada).",
      codigo: "RESERVA_NO_CANCELABLE",
    };
  }

  if (!reserva.pago) {
    return {
      ok: false,
      statusCode: 409,
      mensaje:
        "La reserva no tiene un pago asociado, no es posible registrar QR de reembolso.",
      codigo: "PAGO_NO_ENCONTRADO",
    };
  }

  const cliente = reserva.usuario;
  const mesa = reserva.mesa;
  const local = mesa.local;
  const adminLocal = local.admin;
  const pago = reserva.pago;

  let publicIdQR: string | null = null;

  try {
    // 2) Subir el QR a Cloudinary (desde base64)
    const imagenQR = await subirImagenACloudinary(
      { base64: qr_base64 },
      `reembolsos/reserva-${id_reserva}`
    );
    publicIdQR = imagenQR.public_id;

    // 3) Actualizar dentro de una transacción
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

    // 4) Enviar correo al cliente informando la cancelación y la penalización
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
      ok: true,
      statusCode: 200,
      mensaje:
        "Reserva cancelada correctamente. Se registró el QR para reembolso y la penalización aplicada.",
      data: {
        reserva: reservaActualizada,
        pago: pagoActualizado,
      },
    };
  } catch (error) {
    // Si algo falla después de subir el QR, intentamos limpiar en Cloudinary
    if (publicIdQR) {
      await eliminarImagenesCloudinary([publicIdQR]).catch(() => undefined);
    }
    throw error;
  }
}
