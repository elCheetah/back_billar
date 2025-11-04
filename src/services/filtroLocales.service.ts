// src/services/filtroLocales.service.ts
import prisma from "../config/database";
import { distanciaKm } from "../utils/geolocalizacion";
import { DiaSemana, diaSemanaActualLaPaz, fechaUTCaHHmm, horaActualAncladaUTC } from "../utils/hora";
import { FiltroLocalesNormalizado } from "../middlewares/validarFiltroLocales.middleware";

type LocalCrudo = {
  id_local: number;
  nombre: string;
  direccion: string;
  latitud: any | null;
  longitud: any | null;
  imagenes: { url_imagen: string | null }[];
  horarios: {
    dia_semana: DiaSemana;
    hora_apertura: Date;
    hora_cierre: Date;
    estado: "ACTIVO" | "INACTIVO";
  }[];
};

export type TurnoDTO = {
  hora_apertura: string;
  hora_cierre: string;
  estado: "ACTIVO" | "INACTIVO";
};

export type HorariosAgrupadosDTO = Record<DiaSemana, TurnoDTO[]>;

export type LocalFiltradoDTO = {
  id_local: number;
  nombre: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  distancia_km: number | null;
  tiposDeMesa: string[] | null; // en minúsculas
  imagen: string | null; // url o null
  horarios: HorariosAgrupadosDTO | null;
  estadoActual: "abierto" | "cerrado";
  mensajes?: string[];
};

export async function buscarLocalesFiltrados(filtro: FiltroLocalesNormalizado) {
  const { lat, lng, radioKm, texto, tiposMesa } = filtro;

  // 1) Locales activos con coords, imagen más reciente y todos los turnos
  let locales: LocalCrudo[] = [];
  try {
    locales = await prisma.local.findMany({
      where: { estado: "ACTIVO", latitud: { not: null }, longitud: { not: null } },
      select: {
        id_local: true,
        nombre: true,
        direccion: true,
        latitud: true,
        longitud: true,
        imagenes: { select: { url_imagen: true }, orderBy: { id_imagen: "desc" }, take: 1 },
        horarios: {
          select: { dia_semana: true, hora_apertura: true, hora_cierre: true, estado: true },
          orderBy: [{ dia_semana: "asc" }, { hora_apertura: "asc" }],
        },
      },
    });
  } catch {
    throw new Error("Error al consultar locales.");
  }

  // 2) Distancia + radio
  const conDist = locales
    .map((l) => {
      const la = Number(l.latitud);
      const lo = Number(l.longitud);
      const d = distanciaKm(lat, lng, la, lo);
      return Number.isFinite(d) ? { ...l, _dist: d } : null;
    })
    .filter((l): l is LocalCrudo & { _dist: number } => !!l && l._dist <= radioKm);

  // 3) Filtro por texto (nombre/dirección)
  const porTexto =
    texto && texto.length > 0
      ? conDist.filter((l) => {
          const q = texto.toLowerCase();
          return (l.nombre || "").toLowerCase().includes(q) || (l.direccion || "").toLowerCase().includes(q);
        })
      : conDist;

  // 4) Tipos de mesa por local
  const ids = porTexto.map((l) => l.id_local);
  const tiposPorLocal = await obtenerTiposDeMesaPorLocal(ids);

  // 5) Filtro por tipos (OR: al menos uno). Si no hay tipos => no filtra.
  const seleccion = (tiposMesa ?? []).map((t) => t.toLowerCase());
  const trasTipos =
    seleccion.length === 0
      ? porTexto
      : porTexto.filter((l) => {
          const delLocal = tiposPorLocal.get(l.id_local) ?? [];
          if (!delLocal.length) return false;
          return seleccion.some((t) => delLocal.includes(t)); // OR
        });

  // 6) DTO final
  const ahoraUTC = horaActualAncladaUTC();
  const hoy = diaSemanaActualLaPaz();

  const resultado: LocalFiltradoDTO[] = trasTipos
    .map((l) => {
      const mensajes: string[] = [];

      const imagen = l.imagenes[0]?.url_imagen || null;
      if (!imagen) mensajes.push("Sin imagen disponible");

      const tipos = tiposPorLocal.get(l.id_local) || null;
      if (!tipos || tipos.length === 0) mensajes.push("El local aún no tiene mesas registradas");

      const base: HorariosAgrupadosDTO = {
        LUNES: [], MARTES: [], MIERCOLES: [], JUEVES: [], VIERNES: [], SABADO: [], DOMINGO: [],
      };
      for (const h of l.horarios || []) {
        base[h.dia_semana].push({
          hora_apertura: fechaUTCaHHmm(h.hora_apertura),
          hora_cierre: fechaUTCaHHmm(h.hora_cierre),
          estado: h.estado,
        });
      }
      const sinTurnos = (l.horarios || []).length === 0;
      if (sinTurnos) mensajes.push("Sin horarios disponibles");

      const turnosHoy = (l.horarios || []).filter((h) => h.dia_semana === hoy && h.estado === "ACTIVO");
      const abierto = turnosHoy.some((h) => ahoraUTC >= h.hora_apertura && ahoraUTC < h.hora_cierre);

      return {
        id_local: l.id_local,
        nombre: l.nombre,
        direccion: l.direccion,
        latitud: Number(l.latitud),
        longitud: Number(l.longitud),
        distancia_km: l._dist,
        tiposDeMesa: tipos,
        imagen,
        horarios: sinTurnos ? null : base,
        estadoActual: abierto ? "abierto" : "cerrado",
        ...(mensajes.length ? { mensajes } : {}),
      } as LocalFiltradoDTO;
    })
    .sort((a, b) => (a.distancia_km ?? 0) - (b.distancia_km ?? 0)); // cercano → lejano

  return { total: resultado.length, locales: resultado };
}

async function obtenerTiposDeMesaPorLocal(ids: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (ids.length === 0) return out;

  let filas: { id_local: number; tipo_mesa: string }[] = [];
  try {
    filas = await prisma.mesa.findMany({
      where: { id_local: { in: ids } },
      select: { id_local: true, tipo_mesa: true },
    });
  } catch {
    return out;
  }

  const map = new Map<number, Set<string>>();
  for (const f of filas) {
    if (!map.has(f.id_local)) map.set(f.id_local, new Set<string>());
    map.get(f.id_local)!.add(String(f.tipo_mesa).toLowerCase());
  }

  for (const [k, v] of map.entries()) {
    out.set(k, Array.from(v.values()).sort());
  }
  return out;
}
