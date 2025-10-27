// Extrae latitud y longitud desde varios formatos de URL/strings de Google Maps.
// Retorna { lat, lng } como strings (válidos para Prisma Decimal) o null si no puede parsear.

export type GpsCoords = { lat: string; lng: string };

const FLOAT = '[-+]?\\d+(?:\\.\\d+)?';
const RE_PAIR = new RegExp(`^\\s*(${FLOAT})\\s*,\\s*(${FLOAT})\\s*$`);
const RE_AT   = new RegExp(`@\\s*(${FLOAT})\\s*,\\s*(${FLOAT})\\s*,`);

function dentroDeRango(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function toCoords(a: string, b: string): GpsCoords | null {
  const lat = parseFloat(a);
  const lng = parseFloat(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!dentroDeRango(lat, lng)) return null;
  return { lat: String(lat), lng: String(lng) };
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { try { return decodeURI(s); } catch { return s; } }
}

export function parseGpsFromUrl(input: string): GpsCoords | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1) "lat,lng"
  let m = raw.match(RE_PAIR);
  if (m) return toCoords(m[1], m[2]);

  // 2) "geo:lat,lng"
  m = raw.match(new RegExp(`^geo:\\s*(${FLOAT})\\s*,\\s*(${FLOAT})\\s*$`, 'i'));
  if (m) return toCoords(m[1], m[2]);

  // 3) Intentar como URL
  try {
    const url = new URL(raw);

    // 3.a) path con /@lat,lng,zoom
    m = url.href.match(RE_AT);
    if (m) return toCoords(m[1], m[2]);

    // 3.b) params q | query | ll | center (decodificados)
    for (const key of ["q", "query", "ll", "center"]) {
      const v = url.searchParams.get(key);
      if (!v) continue;
      const dec = safeDecode(v);
      const mm = dec.match(RE_PAIR);
      if (mm) return toCoords(mm[1], mm[2]);
    }

    // 3.c) Fallback: buscar par "lat,lng" en toda la URL decodificada
    const decodedHref = safeDecode(url.href);
    const ff = decodedHref.match(new RegExp(`(${FLOAT})\\s*,\\s*(${FLOAT})`));
    if (ff) return toCoords(ff[1], ff[2]);
  } catch {
    // No es URL -> probar decodificando la cadena completa
    const dec = safeDecode(raw);
    const mm = dec.match(RE_PAIR);
    if (mm) return toCoords(mm[1], mm[2]);
  }

  return null;
}

export function esUrlGpsValida(input: string): boolean {
  return parseGpsFromUrl(input) !== null;
}
