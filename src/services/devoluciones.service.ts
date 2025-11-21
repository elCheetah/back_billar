import prisma from "../config/database";
import {
  EstadoReserva,
  EstadoReembolso,
  EstadoPago,
} from "@prisma/client";
import {
  ImagenEntrada,
  subirImagenACloudinary,
  eliminarImagenesCloudinary,
} from "../utils/cloudinary";
import { enviarCorreoHTML } from "../utils/mailer";
import { refundCompletedEmailHTML } from "../templates/estado-email";

export type DevolucionPendienteDTO = {
  id_reserva: number;
  id_pago: number;
  nombre_local: string;
  numero_mesa: number;
  nombre_cliente: string;
  fecha_reserva: Date;
  hora_inicio: Date;
  duracion_horas: number;
  monto_total_pagado: number;
  monto_penalizado: number;
  monto_total_devolver: number;
  qr_cliente_url: string;
  estado_reserva: EstadoReserva;
};

function calcularDuracionHoras(horaInicio: Date, horaFin: Date): number {
  const diffMs = horaFin.getTime() - horaInicio.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

export async function listarDevolucionesPendientesPropietario(
  idUsuarioPropietario: number
): Promise<DevolucionPendienteDTO[]> {
  const pagos = await prisma.pago.findMany({
    where: {
      estado_reembolso: EstadoReembolso.NO_REEMBOLSADO,
      estado_pago: EstadoPago.APROBADO,
      reserva: {
        estado_reserva: EstadoReserva.CANCELADA,
        mesa: {
          local: {
            id_usuario_admin: idUsuarioPropietario,
          },
        },
      },
    },
    include: {
      reserva: {
        include: {
          usuario: true,
          mesa: {
            include: {
              local: true,
            },
          },
        },
      },
    },
    orderBy: [{ fecha_subida: "asc" }, { id_pago: "asc" }],
  });

  return pagos.map((p) => {
    if (!p.reserva || !p.reserva.mesa || !p.reserva.mesa.local) {
      throw new Error("RESERVA_INCONSISTENTE: Falta relación de local/mesa.");
    }

    const reserva = p.reserva;
    const mesa = reserva.mesa;
    const local = mesa.local;
    const cliente = reserva.usuario;

    const duracion_horas = calcularDuracionHoras(
      reserva.hora_inicio,
      reserva.hora_fin
    );

    const monto_total_pagado = Number(p.monto);
    const monto_penalizado = Number(reserva.monto_penalizacion_aplicada ?? 0);
    const monto_total_devolver = Math.max(
      0,
      monto_total_pagado - monto_penalizado
    );

    const nombre_cliente = `${cliente.primer_apellido}${
      cliente.segundo_apellido ? " " + cliente.segundo_apellido : ""
    } ${cliente.nombre}`;

    return {
      id_reserva: reserva.id_reserva,
      id_pago: p.id_pago,
      nombre_local: local.nombre,
      numero_mesa: mesa.numero_mesa,
      nombre_cliente,
      fecha_reserva: reserva.fecha_reserva,
      hora_inicio: reserva.hora_inicio,
      duracion_horas,
      monto_total_pagado,
      monto_penalizado,
      monto_total_devolver,
      qr_cliente_url: p.qr_para_reembolso || "",
      estado_reserva: reserva.estado_reserva,
    };
  });
}

type RegistrarReembolsoInput = {
  id_reserva: number;
  comprobante_reembolso_base64: string;
};

export async function registrarReembolsoService(
  input: RegistrarReembolsoInput
) {
  const { id_reserva, comprobante_reembolso_base64 } = input;

  if (
    !comprobante_reembolso_base64 ||
    typeof comprobante_reembolso_base64 !== "string" ||
    !comprobante_reembolso_base64.startsWith("data:image/")
  ) {
    throw new Error(
      "IMAGEN_INVALIDA: El comprobante debe ser una dataURI de imagen válida."
    );
  }

  let publicIdSubida: string | null = null;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const pago = await tx.pago.findUnique({
        where: { id_reserva },
        include: {
          reserva: {
            include: {
              usuario: true,
              mesa: {
                include: {
                  local: true,
                },
              },
            },
          },
        },
      });

      if (!pago || !pago.reserva) {
        throw new Error(
          "RESERVA_NO_ENCONTRADA: No existe un pago asociado a esa reserva."
        );
      }

      const reserva = pago.reserva;

      if (!reserva.mesa || !reserva.mesa.local) {
        throw new Error(
          "RESERVA_INCONSISTENTE: La reserva no está asociada correctamente a un local."
        );
      }

      if (reserva.estado_reserva !== EstadoReserva.CANCELADA) {
        throw new Error(
          "RESERVA_NO_CANCELADA: Solo se pueden reembolsar reservas canceladas."
        );
      }

      if (pago.estado_pago !== EstadoPago.APROBADO) {
        throw new Error(
          "PAGO_NO_APROBADO: Solo se pueden reembolsar pagos aprobados."
        );
      }

      if (pago.estado_reembolso === EstadoReembolso.REEMBOLSADO) {
        throw new Error(
          "REEMBOLSO_YA_REGISTRADO: Esta reserva ya fue marcada como reembolsada."
        );
      }

      if (!pago.qr_para_reembolso) {
        throw new Error(
          "QR_CLIENTE_NO_REGISTRADO: No se encontró el QR proporcionado por el cliente para el reembolso."
        );
      }

      const monto_total_pagado = Number(pago.monto);
      const monto_penalizado = Number(
        reserva.monto_penalizacion_aplicada ?? 0
      );
      const monto_total_devolver = Math.max(
        0,
        monto_total_pagado - monto_penalizado
      );

      const imagenEntrada: ImagenEntrada = {
        base64: comprobante_reembolso_base64,
      };

      const subida = await subirImagenACloudinary(
        imagenEntrada,
        "reembolsos/comprobantes"
      );
      publicIdSubida = subida.public_id;

      const pagoActualizado = await tx.pago.update({
        where: { id_pago: pago.id_pago },
        data: {
          estado_reembolso: EstadoReembolso.REEMBOLSADO,
          fecha_reembolso: new Date(),
          monto_reembolsado: monto_total_devolver,
          comprobante_reembolso_url: subida.url,
        },
        include: {
          reserva: {
            include: {
              usuario: true,
              mesa: {
                include: {
                  local: true,
                },
              },
            },
          },
        },
      });

      return {
        pago: pagoActualizado,
        monto_total_pagado,
        monto_penalizado,
        monto_total_devolver,
        comprobante_url: subida.url,
      };
    });

    const r = resultado.pago.reserva;
    const cliente = r.usuario;
    const local = r.mesa.local;

    const nombreCliente = `${cliente.primer_apellido}${
      cliente.segundo_apellido ? " " + cliente.segundo_apellido : ""
    } ${cliente.nombre}`;

    const html = refundCompletedEmailHTML({
      nombreCliente,
      nombreLocal: local.nombre,
      montoTotalPagado: resultado.monto_total_pagado,
      montoPenalizacion: resultado.monto_penalizado,
      montoReembolsado: resultado.monto_total_devolver,
    });

    await enviarCorreoHTML(
      cliente.correo,
      "BilliAR • Confirmación de reembolso de reserva",
      html
    );

    return {
      id_reserva,
      id_pago: resultado.pago.id_pago,
      monto_total_pagado: resultado.monto_total_pagado,
      monto_penalizado: resultado.monto_penalizado,
      monto_reembolsado: resultado.monto_total_devolver,
      comprobante_reembolso_url: resultado.comprobante_url,
    };
  } catch (error) {
    if (publicIdSubida) {
      await eliminarImagenesCloudinary([publicIdSubida]);
    }
    throw error;
  }
}
