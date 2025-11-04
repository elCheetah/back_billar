// src/services/mesaDetalle.service.ts
import prisma from "../config/database";

export type MesaResumenDTO = {
  id: number;
  numero_mesa: number;
  tipo_mesa: string;
  precio_hora: number;
  estado: string;
  imagen: string | null;
};

export type MesasDelLocalResponse = {
  idLocal: number;
  imagenesLocal: string[];
  nombre: string;
  direccion: string;
  contactolocal: string | null;
  mesas: MesaResumenDTO[];
};

export type MesaDetalleResponse = {
  id: number;
  nombre: string;
  tipo_mesa: string;
  precio_hora: number;
  estado: string;
  imagenes: string[];
  qrLocal: string | null;
};

function digitsOnly(cel: string | null | undefined): string | null {
  if (!cel) return null;
  const d = cel.replace(/\D+/g, "");
  return d || null;
}

function waLink(digits: string | null, nombreLocal: string): string | null {
  if (!digits) return null;
  const text = encodeURIComponent(`Hola, quiero consultar sobre reservas de billar del local ${nombreLocal}`);
  return `https://wa.me/${digits}?text=${text}`;
}

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

  const imagenesLocal = (local.imagenes ?? []).map(i => i.url_imagen).filter((u): u is string => !!u);

  const mesas: MesaResumenDTO[] = (local.mesas ?? []).map(m => ({
    id: m.id_mesa,
    numero_mesa: m.numero_mesa,
    tipo_mesa: String(m.tipo_mesa),
    precio_hora: Number(m.precio_hora),
    estado: String(m.estado),
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

export async function getMesaPorIdDetalle(idMesa: number): Promise<MesaDetalleResponse> {
  const mesa = await prisma.mesa.findFirst({
    where: { id_mesa: idMesa },
    select: {
      id_mesa: true,
      numero_mesa: true,
      tipo_mesa: true,
      precio_hora: true,
      estado: true,
      imagenes: { select: { url_imagen: true }, orderBy: { id_imagen: "asc" } },
      local: { select: { qr_pago_url: true } },
    },
  });

  if (!mesa) throw new Error("Mesa no encontrada.");

  const imagenes = (mesa.imagenes ?? []).map(i => i.url_imagen).filter((u): u is string => !!u);

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
