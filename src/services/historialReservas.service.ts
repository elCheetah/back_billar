// src/services/historialReservas.service.ts
import prisma from "../config/database";
import { EstadoReembolso } from "@prisma/client";
import { fechaUTCaHHmm } from "../utils/hora";

type RangoFechas = { desdeUTC: Date; hastaUTC: Date };

export type ItemHistorialDTO = {
  nombreCliente?: string;
  nombreLocal: string;
  numeroMesa: number;
  tipoMesa: string;
  fechaReserva: string;
  horaInicio: string;
  duracion: string;
  pagoEstimado: number | null;
  pagoQr: { monto: number; comprobante_url: string } | null;
  estado: "Cancelada" | "Finalizada" | "Rechazada";
  penalizacion?: string;

  comprobantePagoUrl?: string | null;
  comprobanteReembolsoUrl?: string | null;
  estadoReembolso?: "REEMBOLSADO" | "NO_REEMBOLSADO" | null;
  montoReembolsado?: number | null;
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
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
}) {
  const partes = [u.primer_apellido, u.segundo_apellido || "", u.nombre].filter(
    Boolean
  );
  return partes.join(" ").trim().toUpperCase();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcularPenalDesdeReembolso(pago: {
  monto: any;
  estado_reembolso: EstadoReembolso;
  monto_reembolsado: any | null;
}) {
  const totalPagado = Number(pago.monto ?? 0);
  const reembolsado = Number(pago.monto_reembolsado ?? 0);

  const penalMonto = Math.max(0, round2(totalPagado - reembolsado));
  const penalPct =
    totalPagado > 0 ? round2((penalMonto / totalPagado) * 100) : 0;

  return { totalPagado, reembolsado, penalMonto, penalPct };
}

export async function historialCliente(
  idUsuario: number,
  rango: RangoFechas
): Promise<ItemHistorialDTO[]> {
  const reservas = await prisma.reserva.findMany({
    where: {
      id_usuario: idUsuario,
      estado_reserva: { in: ["CANCELADA", "FINALIZADA", "RECHAZADA"] },
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
      pago: {
        select: {
          monto: true,
          estado_pago: true,
          comprobante_url: true,
          estado_reembolso: true,
          monto_reembolsado: true,
          comprobante_reembolso_url: true,
        },
      },
    },
    orderBy: [{ fecha_reserva: "desc" }, { hora_inicio: "desc" }],
  });

  return reservas.map((r) => {
    const durMin = minutosEntre(r.hora_inicio, r.hora_fin);

    const estado: "Cancelada" | "Finalizada" | "Rechazada" =
      r.estado_reserva === "CANCELADA"
        ? "Cancelada"
        : r.estado_reserva === "RECHAZADA"
        ? "Rechazada"
        : "Finalizada";

    const pago = r.pago ?? null;

    const comprobantePagoUrl = pago?.comprobante_url ?? null;
    const comprobanteReembolsoUrl = pago?.comprobante_reembolso_url ?? null;
    const estadoReembolso =
      estado === "Cancelada" ? (pago?.estado_reembolso ?? null) : null;
    const montoReembolsado =
      estado === "Cancelada" && pago?.monto_reembolsado != null
        ? Number(pago.monto_reembolsado)
        : null;

    const pagoQrVal =
      comprobantePagoUrl && pago
        ? { monto: Number(pago.monto ?? 0), comprobante_url: comprobantePagoUrl }
        : null;

    let pagoEstimadoVal: number | null = null;
    let extra: Partial<ItemHistorialDTO> = {};

    if (estado === "Cancelada") {
      if (
        pago &&
        pago.estado_reembolso === EstadoReembolso.REEMBOLSADO &&
        pago.monto_reembolsado != null
      ) {
        const { penalMonto, penalPct } = calcularPenalDesdeReembolso(pago);
        pagoEstimadoVal = penalMonto === 0 ? 0 : -penalMonto;
        extra = { penalizacion: `Penalización ${round2(penalPct)}%` };
      } else {
        pagoEstimadoVal = null;
      }
    } else if (estado === "Finalizada") {
      pagoEstimadoVal =
        pagoQrVal ? null : r.monto_estimado != null ? Number(r.monto_estimado) : 0;
    } else {
      pagoEstimadoVal = pagoQrVal ? null : r.monto_estimado != null ? Number(r.monto_estimado) : 0;
    }

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
      ...extra,
      comprobantePagoUrl,
      comprobanteReembolsoUrl: estado === "Cancelada" ? comprobanteReembolsoUrl : null,
      estadoReembolso,
      montoReembolsado,
    };
  });
}

export async function historialPropietario(
  idPropietario: number,
  rango: RangoFechas
): Promise<ItemHistorialDTO[]> {
  const locales = await prisma.local.findMany({
    where: { id_usuario_admin: idPropietario },
    select: { id_local: true },
  });
  const idsLocales = locales.map((l) => l.id_local);
  if (idsLocales.length === 0) return [];

  const reservas = await prisma.reserva.findMany({
    where: {
      estado_reserva: { in: ["CANCELADA", "FINALIZADA", "RECHAZADA"] },
      fecha_reserva: { gte: rango.desdeUTC, lte: rango.hastaUTC },
      mesa: { id_local: { in: idsLocales } },
    },
    include: {
      usuario: {
        select: { nombre: true, primer_apellido: true, segundo_apellido: true },
      },
      mesa: {
        select: {
          numero_mesa: true,
          tipo_mesa: true,
          local: { select: { nombre: true } },
        },
      },
      pago: {
        select: {
          monto: true,
          estado_pago: true,
          comprobante_url: true,
          estado_reembolso: true,
          monto_reembolsado: true,
          comprobante_reembolso_url: true,
        },
      },
    },
    orderBy: [{ fecha_reserva: "desc" }, { hora_inicio: "desc" }],
  });

  return reservas.map((r) => {
    const durMin = minutosEntre(r.hora_inicio, r.hora_fin);

    const estado: "Cancelada" | "Finalizada" | "Rechazada" =
      r.estado_reserva === "CANCELADA"
        ? "Cancelada"
        : r.estado_reserva === "RECHAZADA"
        ? "Rechazada"
        : "Finalizada";

    const pago = r.pago ?? null;

    const comprobantePagoUrl = pago?.comprobante_url ?? null;
    const comprobanteReembolsoUrl = pago?.comprobante_reembolso_url ?? null;
    const estadoReembolso =
      estado === "Cancelada" ? (pago?.estado_reembolso ?? null) : null;
    const montoReembolsado =
      estado === "Cancelada" && pago?.monto_reembolsado != null
        ? Number(pago.monto_reembolsado)
        : null;

    const pagoQrVal =
      comprobantePagoUrl && pago
        ? { monto: Number(pago.monto ?? 0), comprobante_url: comprobantePagoUrl }
        : null;

    let pagoEstimadoVal: number | null = null;
    let extra: Partial<ItemHistorialDTO> = {};

    if (estado === "Cancelada") {
      if (
        pago &&
        pago.estado_reembolso === EstadoReembolso.REEMBOLSADO &&
        pago.monto_reembolsado != null
      ) {
        const { penalMonto, penalPct } = calcularPenalDesdeReembolso(pago);
        pagoEstimadoVal = penalMonto;
        extra = { penalizacion: `Penalización ${round2(penalPct)}%` };
      } else {
        pagoEstimadoVal = null;
      }
    } else if (estado === "Finalizada") {
      pagoEstimadoVal =
        pagoQrVal ? null : r.monto_estimado != null ? Number(r.monto_estimado) : 0;
    } else {
      pagoEstimadoVal = pagoQrVal ? null : r.monto_estimado != null ? Number(r.monto_estimado) : 0;
    }

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
      ...extra,
      comprobantePagoUrl,
      comprobanteReembolsoUrl: estado === "Cancelada" ? comprobanteReembolsoUrl : null,
      estadoReembolso,
      montoReembolsado,
    };
  });
}
