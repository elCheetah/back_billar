// src/services/reservar.service.ts
import { PrismaClient, EstadoReserva, EstadoPago } from "@prisma/client";
import { CrearReservaBody } from "../middlewares/reservar.middlewares";
import {
  ImagenEntrada,
  ImagenSalida,
  subirImagenACloudinary,
  eliminarImagenesCloudinary,
} from "../utils/cloudinary";

const prisma = new PrismaClient();

// DTO de entrada
export interface CrearReservaConPagoInput extends CrearReservaBody {
  id_usuario: number;
}

// DTO de salida (extracto / comprobante de reserva)
export interface ComprobanteReservaDTO {
  id_reserva: number;

  nombre_local: string;
  direccion_local: string;

  numero_mesa: number;
  tipo_mesa: string;

  fecha_reserva: Date;
  hora_inicio: Date;
  hora_fin: Date;
  duracion_horas: number;

  monto_total: number;
  descuento_aplicado: boolean;
  porcentaje_descuento: number;

  estado_reserva: EstadoReserva;
  fecha_registro: Date;

  estado_pago: EstadoPago;
}

function construirFechaHora(fecha: string, hora: string): Date {
  const [hour, minute] = hora.split(":").map(Number);
  const base = new Date(`${fecha}T00:00:00`);
  base.setHours(hour, minute, 0, 0);
  return base;
}

export async function crearReservaConPago(
  input: CrearReservaConPagoInput
): Promise<ComprobanteReservaDTO> {
  const {
    id_mesa,
    fecha_reserva,
    hora_inicio,
    hora_fin,
    comprobante_base64,
    id_usuario,
  } = input;

  // 1) Buscar mesa + local
  const mesa = await prisma.mesa.findUnique({
    where: { id_mesa },
    include: { local: true },
  });

  if (!mesa) {
    throw new Error("NO_MESA: La mesa especificada no existe.");
  }

  if (!mesa.local) {
    throw new Error(
      "NO_LOCAL: La mesa no tiene un local asociado registrado correctamente."
    );
  }

  if (mesa.local.estado !== "ACTIVO") {
    throw new Error(
      "LOCAL_INACTIVO: El local no se encuentra activo para recibir reservas."
    );
  }

  // 2) Construir fechas/horas para la reserva
  const fechaReservaDate = new Date(`${fecha_reserva}T00:00:00`);
  const horaInicioDate = construirFechaHora(fecha_reserva, hora_inicio);
  const horaFinDate = construirFechaHora(fecha_reserva, hora_fin);

  const diffMs = horaFinDate.getTime() - horaInicioDate.getTime();
  if (diffMs <= 0) {
    throw new Error(
      "RANGO_INVALIDO: La hora de fin debe ser mayor a la hora de inicio."
    );
  }
  const duracionHoras = diffMs / (1000 * 60 * 60);

  // 3) Verificar reservas en conflicto (permite fin = inicio)
  const reservaConflicto = await prisma.reserva.findFirst({
    where: {
      id_mesa,
      fecha_reserva: fechaReservaDate,
      estado_reserva: {
        in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA],
      },
      hora_inicio: {
        lt: horaFinDate,
      },
      hora_fin: {
        gt: horaInicioDate,
      },
    },
  });

  if (reservaConflicto) {
    throw new Error(
      "CONFLICTO_RESERVA: Ya existe una reserva activa que se solapa con el horario solicitado."
    );
  }

  // 4) Verificar bloqueos de mesa
  const bloqueoConflicto = await prisma.bloqueoMesa.findFirst({
    where: {
      id_mesa,
      fecha_bloqueo: fechaReservaDate,
      hora_inicio: {
        lt: horaFinDate,
      },
      hora_fin: {
        gt: horaInicioDate,
      },
    },
  });

  if (bloqueoConflicto) {
    throw new Error(
      "MESA_BLOQUEADA: La mesa se encuentra bloqueada en el horario solicitado."
    );
  }

  // 5) Calcular montos
  const precioHora = Number(mesa.precio_hora);
  const descuentoLocal = Number(mesa.local.descuento_global ?? 0);

  const totalSinDescuento = precioHora * duracionHoras;
  const totalConDescuento =
    descuentoLocal > 0
      ? totalSinDescuento * (1 - descuentoLocal / 100)
      : totalSinDescuento;

  const montoEstimado = Number(totalConDescuento.toFixed(2));
  const descuentoAplicado = descuentoLocal > 0;

  // 6) Subir comprobante a Cloudinary
  const publicIds: string[] = [];
  let imagenComprobante: ImagenSalida | null = null;

  try {
    const entradaImg: ImagenEntrada = {
      base64: comprobante_base64,
      url_remota: null,
    };

    imagenComprobante = await subirImagenACloudinary(
      entradaImg,
      `pagos/mesa-${id_mesa}`
    );
    if (imagenComprobante?.public_id) {
      publicIds.push(imagenComprobante.public_id);
    }

    // 7) Transacción: Reserva + Pago
    const result = await prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.create({
        data: {
          id_usuario,
          id_mesa,
          fecha_reserva: fechaReservaDate,
          hora_inicio: horaInicioDate,
          hora_fin: horaFinDate,
          monto_estimado: montoEstimado,
          estado_reserva: EstadoReserva.PENDIENTE,
          penalizacion_aplicada: 0,
        },
      });

      const pago = await tx.pago.create({
        data: {
          id_reserva: reserva.id_reserva,
          id_usuario,
          monto: montoEstimado,
          comprobante_url: imagenComprobante?.url ?? null,
          estado_pago: EstadoPago.PENDIENTE,
        },
      });

      return { reserva, pago };
    });

    const { reserva, pago } = result;

    const dto: ComprobanteReservaDTO = {
      id_reserva: reserva.id_reserva,

      nombre_local: mesa.local.nombre,
      direccion_local: mesa.local.direccion,

      numero_mesa: mesa.numero_mesa,
      tipo_mesa: mesa.tipo_mesa,

      fecha_reserva: reserva.fecha_reserva,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      duracion_horas: duracionHoras,

      monto_total: montoEstimado,
      descuento_aplicado: descuentoAplicado,
      porcentaje_descuento: descuentoAplicado ? descuentoLocal : 0,

      estado_reserva: reserva.estado_reserva,
      fecha_registro: reserva.fecha_creacion,

      estado_pago: pago.estado_pago,
    };

    return dto;
  } catch (err) {
    if (publicIds.length) {
      await eliminarImagenesCloudinary(publicIds);
    }
    throw err;
  }
}
