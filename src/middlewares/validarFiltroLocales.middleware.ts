// src/middlewares/validarFiltroLocales.middleware.ts
import { NextFunction, Request, Response } from "express";
import { CENTRO_COCHABAMBA, normalizarRadioKm, parseNumero } from "../utils/geolocalizacion";

const TIPOS_PERMITIDOS = ["POOL", "CARAMBOLA", "SNOOKER", "MIXTO"] as const;
type TipoMesa = typeof TIPOS_PERMITIDOS[number];

export type FiltroLocalesNormalizado = {
  lat: number;
  lng: number;
  radioKm: number;
  tipoMesa?: TipoMesa;
  texto?: string;
};

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

    let tipoMesa: any = src.tipoMesa;
    if (typeof tipoMesa === "string") {
      tipoMesa = tipoMesa.trim().toUpperCase();
      if (!TIPOS_PERMITIDOS.includes(tipoMesa)) tipoMesa = undefined;
    } else {
      tipoMesa = undefined;
    }

    const texto = typeof src.texto === "string" ? src.texto.trim() : undefined;

    (req as any).filtroLocales = {
      lat, lng, radioKm,
      ...(tipoMesa ? { tipoMesa } : {}),
      ...(texto ? { texto } : {}),
    } as FiltroLocalesNormalizado;

    return next();
  } catch (e: any) {
    return res.status(400).json({ ok: false, message: e?.message || "Datos del filtro inválidos." });
  }
}
