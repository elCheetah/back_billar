// src/middlewares/validarFiltroLocales.middleware.ts
import { NextFunction, Request, Response } from "express";
import { CENTRO_COCHABAMBA, normalizarRadioKm, parseNumero } from "../utils/geolocalizacion";

const TIPOS_PERMITIDOS = ["POOL", "CARAMBOLA", "SNOOKER", "MIXTO"] as const;
type TipoMesa = typeof TIPOS_PERMITIDOS[number];

export type FiltroLocalesNormalizado = {
  lat: number;
  lng: number;
  radioKm: number;
  tiposMesa?: TipoMesa[];  // ← lista de tipos (opcional)
  texto?: string;
};

function parseTipos(raw: unknown): TipoMesa[] | undefined {
  const add = (acc: Set<TipoMesa>, v: string) => {
    const up = v.trim().toUpperCase();
    if ((TIPOS_PERMITIDOS as readonly string[]).includes(up)) acc.add(up as TipoMesa);
  };
  const set = new Set<TipoMesa>();

  if (typeof raw === "string") {
    // Soportamos un solo valor: ?tipos=POOL
    add(set, raw);
  } else if (Array.isArray(raw)) {
    // Soportamos repetidos: ?tipos=POOL&tipos=SNOOKER&tipos=MIXTO
    for (const item of raw) if (typeof item === "string") add(set, item);
  }
  const arr = Array.from(set);
  return arr.length ? arr : undefined;
}

export function validarFiltroLocales(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, message: "Método no permitido. Solo GET." });
    }

    const src: any = req.query;

    let lat = parseNumero(src.lat);
    let lng = parseNumero(src.lng);
    const radioKm = normalizarRadioKm(src.radioKm, 3);

    if (lat === null || lng === null) {
      lat = CENTRO_COCHABAMBA.lat;
      lng = CENTRO_COCHABAMBA.lng;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, message: "Coordenadas inválidas." });
    }

    const tiposMesa = parseTipos(src.tipos); // ← ÚNICO punto de entrada para tipos
    const texto = typeof src.texto === "string" ? src.texto.trim() : undefined;

    (req as any).filtroLocales = {
      lat,
      lng,
      radioKm,
      ...(tiposMesa ? { tiposMesa } : {}), // si no hay, no filtra por tipo
      ...(texto ? { texto } : {}),
    } as FiltroLocalesNormalizado;

    return next();
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e?.message || "Datos del filtro inválidos." });
  }
}
