import prisma from "../config/database";
import { subirImagenACloudinary, ImagenEntrada } from "../utils/cloudinary";

export type PerfilDTO = {
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  correo: string;
  celular: string | null;
  rol: "CLIENTE" | "PROPIETARIO" | "ADMINISTRADOR";
  fecha_creacion: string; // "YYYY-MM-DD"
  foto_url: string | null;
};

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
      fecha_creacion: true,
    },
  });
  if (!usuario) throw new Error("Usuario no encontrado.");

  const imagen = await prisma.imagen.findFirst({
    where: { usuarioId: idUsuario, localId: null, mesaId: null },
    select: { url_imagen: true },
    orderBy: { id_imagen: "desc" },
  });

  return {
    nombre: usuario.nombre,
    primer_apellido: usuario.primer_apellido,
    segundo_apellido: usuario.segundo_apellido,
    correo: usuario.correo,
    celular: usuario.celular,
    rol: usuario.rol as PerfilDTO["rol"],
    fecha_creacion: usuario.fecha_creacion.toISOString().split("T")[0],
    foto_url: imagen?.url_imagen || null,
  };
}

export async function editarPerfilUsuario(
  idUsuario: number,
  data: Partial<{ nombre: string; primer_apellido: string; segundo_apellido: string | null; celular: string | null }>
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
  imagen: ImagenEntrada // Debe traer SOLO base64 (validado por middleware)
): Promise<{ foto_url: string }> {
  // Subir a Cloudinary (mantiene compatibilidad, pero enviamos solo base64)
  const subida = await subirImagenACloudinary({ base64: imagen.base64 || null, url_remota: null }, `perfiles/${idUsuario}`);

  // Upsert de foto en tabla Imagen: guardar SOLO url_imagen, base64 siempre null
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

export async function eliminarFotoPerfilUsuario(idUsuario: number): Promise<void> {
  const existente = await prisma.imagen.findFirst({
    where: { usuarioId: idUsuario, localId: null, mesaId: null },
    select: { id_imagen: true },
  });

  if (!existente) throw new Error("No hay foto para eliminar.");
  await prisma.imagen.delete({ where: { id_imagen: existente.id_imagen } });
}
