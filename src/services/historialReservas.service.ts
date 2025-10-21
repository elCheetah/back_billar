// src/services/historialReservas.service.ts
import prisma from "../config/database";
import { fechaUTCaHHmm } from "../utils/hora";

// Helpers de rango de fechas (últimos N meses, en UTC e incluyendo el día actual)
function inicioDeDiaUTC(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
function finDeDiaUTC(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}
function restarMesesUTC(fecha: Date, meses: number) {
    const y = fecha.getUTCFullYear();
    const m = fecha.getUTCMonth();
    const day = fecha.getUTCDate();
    // construimos en UTC para evitar desfases por zona horaria
    const base = new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
    base.setUTCMonth(base.getUTCMonth() - meses);
    return base;
}

function minutosEntre(a: Date, b: Date) {
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function deducirMetodoPago(pago: { estado_pago: string; comprobante_url: string | null } | null) {
    if (!pago || pago.estado_pago !== "APROBADO") return null;
    return pago.comprobante_url ? "QR" : "EFECTIVO";
}

/**
 * Historial (cliente): últimos `meses` (default 3), solo FINALIZADA o CANCELADA.
 * Campos mínimos y relevantes:
 * - fecha (YYYY-MM-DD)
 * - hora_inicio, hora_fin (HH:mm, UTC)
 * - duracion_horas (2 decimales)
 * - costo (número: pago aprobado -> pago.monto; si FINALIZADA -> monto_estimado; si CANCELADA -> 0; fallback 0)
 * - local_nombre
 * - resultado ("ASISTIO" | "CANCELO")
 * - metodo_pago ("QR" | "EFECTIVO" | null)
 */
export async function obtenerHistorialReservasUsuario(
    idUsuario: number,
    meses: number = 3
) {
    const ahora = new Date();
    const hoy = finDeDiaUTC(ahora);
    const desde = inicioDeDiaUTC(restarMesesUTC(ahora, meses));

    const reservas = await prisma.reserva.findMany({
        where: {
            id_usuario: idUsuario,
            estado_reserva: { in: ["CANCELADA", "FINALIZADA"] },
            fecha_reserva: { gte: desde, lte: hoy },
        },
        include: {
            mesa: {
                select: {
                    local: { select: { nombre: true } }, // SOLO el nombre del local
                },
            },
            pago: {
                select: {
                    monto: true,
                    estado_pago: true,
                    comprobante_url: true,
                },
            },
        },
        orderBy: [{ fecha_reserva: "desc" }, { hora_inicio: "desc" }],
    });

    const data = reservas.map((r) => {
        // costo: preferimos pago aprobado; si no, si FINALIZADA usamos estimado; si CANCELADA => 0
        let costo: number;
        if (r.pago?.estado_pago === "APROBADO" && r.pago.monto != null) {
            costo = Number(r.pago.monto);
        } else if (r.estado_reserva === "FINALIZADA" && r.monto_estimado != null) {
            costo = Number(r.monto_estimado);
        } else if (r.estado_reserva === "CANCELADA") {
            costo = 0;
        } else {
            // fallback seguro (mantener siempre número)
            costo = 0;
        }

        const durMin = minutosEntre(r.hora_inicio, r.hora_fin);
        const durHoras = Number((durMin / 60).toFixed(2));

        const resultado = r.estado_reserva === "FINALIZADA" ? "ASISTIO" : "CANCELO";
        const metodo_pago = deducirMetodoPago(r.pago);

        return {
            fecha: r.fecha_reserva.toISOString().slice(0, 10),
            hora_inicio: fechaUTCaHHmm(r.hora_inicio),
            hora_fin: fechaUTCaHHmm(r.hora_fin),
            duracion_horas: durHoras,
            costo, // número (0 si no hay pago aprobado ni estimado)
            local_nombre: r.mesa.local.nombre,
            resultado, // "ASISTIO" | "CANCELO"
            metodo_pago, // "QR" | "EFECTIVO" | null
        };
    });

    return data;
}
