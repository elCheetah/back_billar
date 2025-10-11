// Extrae latitud y longitud desde varios formatos de URL/strings de Google Maps.
// Retorna { lat, lng } como strings (válidos para Prisma Decimal) o null si no puede parsear.

export type GpsCoords = { lat: string; lng: string };

const FLOAT = '[-+]?\\d+(?:\\.\\d+)?';

function dentroDeRango(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseGpsFromUrl(input: string): GpsCoords | null {
  if (!input) return null;
  const raw = input.trim();

  // 1) "lat,lng"
  const simple = new RegExp(`^\\s*(${FLOAT})\\s*,\\s*(${FLOAT})\\s*$`);
  let m = raw.match(simple);
  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (dentroDeRango(lat, lng)) return { lat: String(lat), lng: String(lng) };
    return null;
  }

  // 2) Intentar como URL
  try {
    const url = new URL(raw);

    // 2.a) query ?q=lat,lng
    const q = url.searchParams.get('q');
    if (q) {
      const mq = q.match(new RegExp(`(${FLOAT})\\s*,\\s*(${FLOAT})`));
      if (mq) {
        const lat = parseFloat(mq[1]);
        const lng = parseFloat(mq[2]);
        if (dentroDeRango(lat, lng)) return { lat: String(lat), lng: String(lng) };
      }
    }

    // 2.b) path con /@lat,lng,zoom
    const at = url.href.match(new RegExp(`@\\s*(${FLOAT})\\s*,\\s*(${FLOAT})\\s*,`));
    if (at) {
      const lat = parseFloat(at[1]);
      const lng = parseFloat(at[2]);
      if (dentroDeRango(lat, lng)) return { lat: String(lat), lng: String(lng) };
    }

    // 2.c) Fallback: primera pareja de floats en toda la URL
    const cualquier = url.href.match(new RegExp(`(${FLOAT}).*?(${FLOAT})`));
    if (cualquier) {
      const lat = parseFloat(cualquier[1]);
      const lng = parseFloat(cualquier[2]);
      if (dentroDeRango(lat, lng)) return { lat: String(lat), lng: String(lng) };
    }
  } catch {
    // no es URL válida; no pasa nada, devolvemos null
  }

  return null;
}

export function esUrlGpsValida(input: string): boolean {
  return parseGpsFromUrl(input) !== null;
}
