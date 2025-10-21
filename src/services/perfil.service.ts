// src/services/perfil.service.ts
import prisma from "../config/database";
import { subirImagenACloudinary, ImagenEntrada } from "../utils/cloudinary";

// Respuesta limpia para el front
export type PerfilDTO = {
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  correo: string;
  celular: string | null;
  rol: "CLIENTE" | "PROPIETARIO" | "ADMINISTRADOR";
  foto_url: string | null;
  propietario: null | {
    id_local: number;
    nombre_local: string;
    mesas_total: number;
    gps_url: string | null; // generada con lat/lon si existen
  };
};

function construirGpsUrlDesdeLatLon(local: {
  latitud: any | null;
  longitud: any | null;
}): string | null {
  const lat = local?.latitud !== null && local?.latitud !== undefined ? Number(local.latitud) : null;
  const lon = local?.longitud !== null && local?.longitud !== undefined ? Number(local.longitud) : null;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return `https://www.google.com/maps?q=${lat},${lon}`;
  }
  return null;
}

export async function obtenerPerfilUsuario(idUsuario: number): Promise<PerfilDTO> {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
    select: {
      nombre: true,
      primer_apellido: true,
      segundo_apellido: true,
      correo: true,
      celular: true,
      rol: true,
    },
  });
  if (!usuario) throw new Error("Usuario no encontrado.");

  // Foto de perfil: una fila de Imagen con usuarioId y sin local/mesa.
  const imagen = await prisma.imagen.findFirst({
    where: { usuarioId: idUsuario, localId: null, mesaId: null },
    select: { url_imagen: true },
    orderBy: { id_imagen: "desc" },
  });

  let propietario: PerfilDTO["propietario"] = null;

  if (usuario.rol === "PROPIETARIO") {
    // Traemos el local del que es admin y el conteo de mesas
    const local = await prisma.local.findFirst({
      where: { id_usuario_admin: idUsuario },
      include: { _count: { select: { mesas: true } } }, // <- correcto para contar mesas
    });

    if (local) {
      propietario = {
        id_local: local.id_local,
        nombre_local: local.nombre,
        mesas_total: local._count.mesas,
        gps_url: construirGpsUrlDesdeLatLon(local),
      };
    }
  }

  return {
    nombre: usuario.nombre,
    primer_apellido: usuario.primer_apellido,
    segundo_apellido: usuario.segundo_apellido,
    correo: usuario.correo,
    celular: usuario.celular,
    rol: usuario.rol as PerfilDTO["rol"],
    foto_url: imagen?.url_imagen || null,
    propietario,
  };
}

export type EditarPerfilInput = Partial<
  Pick<PerfilDTO, "nombre" | "primer_apellido" | "segundo_apellido" | "celular">
>;

export async function editarPerfilUsuario(
  idUsuario: number,
  data: EditarPerfilInput
): Promise<PerfilDTO> {
  const { nombre, primer_apellido, segundo_apellido, celular } = data;

  const actualizado = await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: {
      ...(typeof nombre === "string" ? { nombre } : {}),
      ...(typeof primer_apellido === "string" ? { primer_apellido } : {}),
      ...(typeof segundo_apellido !== "undefined" ? { segundo_apellido } : {}),
      ...(typeof celular !== "undefined" ? { celular } : {}),
    },
    select: { id_usuario: true },
  });

  return obtenerPerfilUsuario(actualizado.id_usuario);
}

export async function actualizarFotoPerfilUsuario(
  idUsuario: number,
  imagen: ImagenEntrada
): Promise<{ foto_url: string }> {
  // Subir a Cloudinary: guardamos solo el URL
  const subida = await subirImagenACloudinary(imagen, `perfiles/${idUsuario}`);

  // Upsert "perfil": usuarioId = idUsuario, localId/mesaId = null
  const existente = await prisma.imagen.findFirst({
    where: { usuarioId: idUsuario, localId: null, mesaId: null },
    select: { id_imagen: true },
  });

  if (existente) {
    await prisma.imagen.update({
      where: { id_imagen: existente.id_imagen },
      data: { url_imagen: subida.url, base64: null },
    });
  } else {
    await prisma.imagen.create({
      data: { usuarioId: idUsuario, url_imagen: subida.url, base64: null },
    });
  }

  return { foto_url: subida.url };
}
