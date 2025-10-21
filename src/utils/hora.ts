// src/utils/hora.ts
// Guardamos / leemos @db.Time como fecha anclada en UTC 1970-01-01

export function hhmmAFechaUTC(hhmm: string): Date {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hhmm)) {
    throw new Error("Hora inválida. Usa 'HH:mm'.");
  }
  const [h, m, s] = hhmm.split(":").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(1970, 0, 1, h, m, s || 0, 0));
}

export function fechaUTCaHHmm(d: Date): string {
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export type DiaSemana =
  | "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";

export function normalizarDiaSemana(dia: string): DiaSemana {
  const up = dia?.trim().toUpperCase();
  const ok = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
  if (!ok.includes(up)) throw new Error("Día inválido.");
  return up as DiaSemana;
}

// Solape entre [a1,a2) y [b1,b2)
export function haySolape(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1 < b2 && b1 < a2;
}
