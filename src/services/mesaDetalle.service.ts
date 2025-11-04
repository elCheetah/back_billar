import prisma from "../config/database";

/* ======================= Tipos de respuesta (DTOs) ======================= */

export type MesaResumenDTO = {
  id: number;
  numero_mesa: number;
  tipo_mesa: string;      // enum DB tal cual (POOL/CARAMBOLA/SNOOKER/MIXTO)
  precio_hora: number;    // número
  estado: string;         // "DISPONIBLE" | "OCUPADO"
  imagen: string | null;  // PRIMERA imagen de la mesa (o null)
};

export type MesasDelLocalResponse = {
  idLocal: number;
  imagenesLocal: string[];      // todas las imágenes del local (puede ser [])
  nombre: string;
  direccion: string;
  contactolocal: string | null; // wa.me con nombre del local (o null si no hay celular)
  mesas: MesaResumenDTO[];      // solo mesas DISPONIBLE/OCUPADO
};

export type MesaDetalleResponse = {
  id: number;
  nombre: string;         // "Mesa <numero_mesa>"
  tipo_mesa: string;      // enum DB tal cual
  precio_hora: number;    // número
  estado: string;         // cualquiera del enum EstadoMesa
  imagenes: string[];     // TODAS las imágenes de la mesa (puede ser [])
  qrLocal: string | null; // qr_pago_url del local (o null)
};

/* ======================= Helpers internos ======================= */

function digitsOnly(cel: string | null | undefined): string | null {
  if (!cel) return null;
  const d = cel.replace(/\D+/g, "");
  return d || null;
}

function waLink(digits: string | null, nombreLocal: string): string | null {
  if (!digits) return null;
  const text = encodeURIComponent(
    `Hola, quiero consultar sobre reservas de billar del local ${nombreLocal}`
  );
  return `https://wa.me/${digits}?text=${text}`;
}

/* ======================= Services ======================= */

/**
 * Mesas del local: SOLO estados DISPONIBLE u OCUPADO.
 * Devuelve también TODAS las imágenes del local y link de WhatsApp del propietario (si tiene celular).
 */
export async function getMesasDelLocalActivas(idLocal: number): Promise<MesasDelLocalResponse> {
  const local = await prisma.local.findFirst({
    where: { id_local: idLocal, estado: "ACTIVO" },
    select: {
      id_local: true,
      nombre: true,
      direccion: true,
      admin: { select: { celular: true } },
      imagenes: { select: { url_imagen: true }, orderBy: { id_imagen: "asc" } },
      mesas: {
        where: { estado: { in: ["DISPONIBLE", "OCUPADO"] } },
        select: {
          id_mesa: true,
          numero_mesa: true,
          tipo_mesa: true,
          precio_hora: true,
          estado: true,
          imagenes: { select: { url_imagen: true }, orderBy: { id_imagen: "asc" }, take: 1 },
        },
        orderBy: { numero_mesa: "asc" },
      },
    },
  });

  if (!local) throw new Error("Local no encontrado o inactivo.");

  const imagenesLocal: string[] = (local.imagenes ?? [])
    .map((i) => i.url_imagen)
    .filter((u): u is string => !!u);

  const mesas: MesaResumenDTO[] = (local.mesas ?? []).map((m) => ({
    id: m.id_mesa,
    numero_mesa: m.numero_mesa,
    tipo_mesa: String(m.tipo_mesa),
    precio_hora: Number(m.precio_hora),
    estado: String(m.estado), // ya filtradas a DISPONIBLE/OCUPADO
    imagen: m.imagenes?.[0]?.url_imagen ?? null,
  }));

  const cel = digitsOnly(local.admin?.celular ?? null);
  const contacto = waLink(cel, local.nombre);

  return {
    idLocal: local.id_local,
    imagenesLocal,
    nombre: local.nombre,
    direccion: local.direccion,
    contactolocal: contacto,
    mesas,
  };
}

/**
 * Detalle de una mesa por id: devuelve TODAS sus imágenes y el qr del local al que pertenece.
 */
export async function getMesaPorIdDetalle(idMesa: number): Promise<MesaDetalleResponse> {
  const mesa = await prisma.mesa.findFirst({
    where: { id_mesa: idMesa },
    select: {
      id_mesa: true,
      numero_mesa: true,
      tipo_mesa: true,
      precio_hora: true,
      estado: true,
      imagenes: { select: { url_imagen: true }, orderBy: { id_imagen: "asc" } }, // TODAS
      local: { select: { qr_pago_url: true } }, // qr del local
    },
  });

  if (!mesa) throw new Error("Mesa no encontrada.");

  const imagenes: string[] = (mesa.imagenes ?? [])
    .map((i) => i.url_imagen)
    .filter((u): u is string => !!u);

  return {
    id: mesa.id_mesa,
    nombre: `Mesa ${mesa.numero_mesa}`,
    tipo_mesa: String(mesa.tipo_mesa),
    precio_hora: Number(mesa.precio_hora),
    estado: String(mesa.estado),
    imagenes,
    qrLocal: mesa.local?.qr_pago_url ?? null,
  };
}
