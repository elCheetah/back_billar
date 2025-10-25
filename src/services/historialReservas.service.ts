// src/services/historialReservas.service.ts
import prisma from "../config/database";
import { fechaUTCaHHmm } from "../utils/hora";

type RangoFechas = { desdeUTC: Date; hastaUTC: Date };

export type ItemHistorialDTO = {
  // Solo propietario
  nombreCliente?: string; // MAYÚSCULAS

  nombreLocal: string;
  numeroMesa: number;
  tipoMesa: string;

  fechaReserva: string;   // YYYY-MM-DD
  horaInicio: string;     // HH:mm (UTC anclado)
  duracion: string;       // HH:mm

  // uno u otro
  pagoEstimado: number | null;
  pagoQr: { monto: number; comprobante_url: string } | null;

  estado: "Cancelada" | "Finalizada";
};

function minutosEntre(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}
function formatoHHmmDeMinutos(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function nombreMayusculas(u: {
  nombre: string; primer_apellido: string; segundo_apellido: string | null;
}) {
  const partes = [u.nombre, u.primer_apellido, u.segundo_apellido || ""].filter(Boolean);
  return partes.join(" ").trim().toUpperCase();
}

export async function historialCliente(
  idUsuario: number,
  rango: RangoFechas
): Promise<ItemHistorialDTO[]> {
  const reservas = await prisma.reserva.findMany({
    where: {
      id_usuario: idUsuario,
      estado_reserva: { in: ["CANCELADA", "FINALIZADA"] },
      fecha_reserva: { gte: rango.desdeUTC, lte: rango.hastaUTC },
    },
    include: {
      mesa: {
        select: {
          numero_mesa: true,
          tipo_mesa: true,
          local: { select: { nombre: true } },
        },
      },
      pago: { select: { monto: true, estado_pago: true, comprobante_url: true } },
    },
    orderBy: [{ fecha_reserva: "desc" }, { hora_inicio: "desc" }],
  });

  return reservas.map((r) => {
    const durMin = minutosEntre(r.hora_inicio, r.hora_fin);
    const estado: "Cancelada" | "Finalizada" =
      r.estado_reserva === "CANCELADA" ? "Cancelada" : "Finalizada";

    const pagoQrVal =
      r.pago && r.pago.estado_pago === "APROBADO" && r.pago.comprobante_url
        ? { monto: Number(r.pago.monto), comprobante_url: r.pago.comprobante_url }
        : null;

    const pagoEstimadoVal =
      pagoQrVal ? null : (r.monto_estimado != null ? Number(r.monto_estimado) : 0);

    return {
      nombreLocal: r.mesa.local.nombre,
      numeroMesa: r.mesa.numero_mesa,
      tipoMesa: String(r.mesa.tipo_mesa).toLowerCase(),

      fechaReserva: r.fecha_reserva.toISOString().slice(0, 10),
      horaInicio: fechaUTCaHHmm(r.hora_inicio),
      duracion: formatoHHmmDeMinutos(durMin),

      pagoEstimado: pagoEstimadoVal,
      pagoQr: pagoQrVal,

      estado,
    };
  });
}

export async function historialPropietario(
  idPropietario: number,
  rango: RangoFechas
): Promise<ItemHistorialDTO[]> {
  // Locales del propietario
  const locales = await prisma.local.findMany({
    where: { id_usuario_admin: idPropietario },
    select: { id_local: true },
  });
  const idsLocales = locales.map((l) => l.id_local);
  if (idsLocales.length === 0) return [];

  const reservas = await prisma.reserva.findMany({
    where: {
      estado_reserva: { in: ["CANCELADA", "FINALIZADA"] },
      fecha_reserva: { gte: rango.desdeUTC, lte: rango.hastaUTC },
      mesa: { id_local: { in: idsLocales } },
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
        },
      },
      mesa: {
        select: {
          numero_mesa: true,
          tipo_mesa: true,
          local: { select: { nombre: true } },
        },
      },
      pago: { select: { monto: true, estado_pago: true, comprobante_url: true } },
    },
    orderBy: [{ fecha_reserva: "desc" }, { hora_inicio: "desc" }],
  });

  return reservas.map((r) => {
    const durMin = minutosEntre(r.hora_inicio, r.hora_fin);
    const estado: "Cancelada" | "Finalizada" =
      r.estado_reserva === "CANCELADA" ? "Cancelada" : "Finalizada";

    const pagoQrVal =
      r.pago && r.pago.estado_pago === "APROBADO" && r.pago.comprobante_url
        ? { monto: Number(r.pago.monto), comprobante_url: r.pago.comprobante_url }
        : null;

    const pagoEstimadoVal =
      pagoQrVal ? null : (r.monto_estimado != null ? Number(r.monto_estimado) : 0);

    return {
      nombreCliente: nombreMayusculas(r.usuario),
      nombreLocal: r.mesa.local.nombre,
      numeroMesa: r.mesa.numero_mesa,
      tipoMesa: String(r.mesa.tipo_mesa).toLowerCase(),

      fechaReserva: r.fecha_reserva.toISOString().slice(0, 10),
      horaInicio: fechaUTCaHHmm(r.hora_inicio),
      duracion: formatoHHmmDeMinutos(durMin),

      pagoEstimado: pagoEstimadoVal,
      pagoQr: pagoQrVal,

      estado,
    };
  });
}
