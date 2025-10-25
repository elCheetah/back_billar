// src/utils/geolocalizacion.ts

export const CENTRO_COCHABAMBA = { lat: -17.3895, lng: -66.1568 };

/** Distancia Haversine en KM */
export function distanciaKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number.isFinite(d) ? +d.toFixed(3) : Infinity;
}

function deg2rad(g: number) { return g * (Math.PI / 180); }

/** Parse seguro de número; null si inválido */
export function parseNumero(n: any): number | null {
  if (n === undefined || n === null || n === "") return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

/** Normaliza radio con límites (0.5–50km) y default 3km */
export function normalizarRadioKm(radio?: any, def: number = 3): number {
  const v = parseNumero(radio);
  const val = v === null ? def : v;
  return Math.min(50, Math.max(0.5, val));
}
