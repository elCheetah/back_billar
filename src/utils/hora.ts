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


/** Día de semana actual en zona America/La_Paz (0=DOMINGO ... 6=SABADO) */
export function diaSemanaActualLaPaz(): DiaSemana {
  const ahoraBo = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" })
  );
  const dow = ahoraBo.getDay();
  return (
    ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"][dow]
  ) as DiaSemana;
}

/**
 * Hora actual de Bolivia anclada a 1970-01-01 en UTC (para comparar con @db.Time).
 * Ej.: si en Bolivia son 14:30, retorna Date.UTC(1970,0,1,14,30,00).
 */
export function horaActualAncladaUTC(): Date {
  const bo = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" })
  );
  return new Date(Date.UTC(1970, 0, 1, bo.getHours(), bo.getMinutes(), bo.getSeconds(), 0));
}

/** Fecha/hora actual en zona America/La_Paz como Date "local" */
export function ahoraLaPaz(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
}

/** YYYY-MM-DD de HOY en Bolivia */
export function hoyLaPazYYYYMMDD(): string {
  const bo = ahoraLaPaz();
  const y = bo.getFullYear();
  const m = (bo.getMonth() + 1).toString().padStart(2, "0");
  const d = bo.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD a partir de una Date UTC (00:00 del día) */
export function fechaUTCaYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}