import prisma from "../config/database";
import { parseGpsFromUrl } from "../utils/gps";
import {
  subirMultiplesImagenesACloudinary,
  eliminarImagenesCloudinary,
  ImagenEntrada,
} from "../utils/cloudinary";

// Normaliza SOLO base64 (data URI)
function normalizarImagenesBase64(arr?: Array<string | { base64: string }>): ImagenEntrada[] {
  if (!arr?.length) return [];
  return arr.map((it) => (typeof it === "string" ? { base64: it } : { base64: it.base64 }));
}

// Construye URL de Google Maps para mostrar en el front
function buildGoogleMapsUrl(lat?: string | null, lng?: string | null): string | null {
  if (!lat || !lng) return null;
  const q = `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

type ActualizarDTO = {
  nombre?: string;
  direccion?: string;
  ciudad?: string;
  gps_url?: string; // única forma de actualizar ubicación
  agregar_imagenes?: Array<string | { base64: string }>;
  eliminar_imagen_ids?: number[];
};

export const DatosLocalService = {
  async getLocalByUser(userId: number) {
    const local = await prisma.local.findFirst({
      where: { id_usuario_admin: userId, estado: "ACTIVO" },
      select: { id_local: true },
    });
    if (!local) throw new Error("El usuario no tiene un local activo.");
    return local;
  },

  async obtener(userId: number) {
    const { id_local } = await this.getLocalByUser(userId);

    const local = await prisma.local.findUnique({
      where: { id_local },
      select: {
        id_local: true,
        nombre: true,
        direccion: true,
        ciudad: true,
        latitud: true,
        longitud: true,
        imagenes: {
          select: { id_imagen: true, url_imagen: true, fecha_creacion: true },
          orderBy: { id_imagen: "asc" },
        },
      },
    });
    if (!local) throw new Error("Local no encontrado.");

    const google_maps_url = buildGoogleMapsUrl(
      local.latitud ? String(local.latitud) : null,
      local.longitud ? String(local.longitud) : null
    );

    return {
      id_local: local.id_local,
      nombre: local.nombre,
      direccion: local.direccion,
      ciudad: local.ciudad,
      ubicacion: { google_maps_url },
      imagenes: local.imagenes, // solo URL; no base64
    };
  },

  async actualizar(userId: number, data: ActualizarDTO) {
    const { id_local } = await this.getLocalByUser(userId);

    // Ubicación: SOLO desde gps_url (si viene)
    let latStr: string | undefined;
    let lngStr: string | undefined;
    if (data.gps_url && data.gps_url.trim()) {
      const coords = parseGpsFromUrl(data.gps_url.trim());
      if (!coords) throw new Error("gps_url no contiene coordenadas válidas.");
      latStr = String(coords.lat);
      lngStr = String(coords.lng);
    }

    // Solo base64
    const imagenesEntrada = normalizarImagenesBase64(data.agregar_imagenes);
    const { subidas, publicIds } = await subirMultiplesImagenesACloudinary(imagenesEntrada, "locales");

    try {
      const actualizado = await prisma.$transaction(async (tx) => {
        // 1) Actualizar campos permitidos
        await tx.local.update({
          where: { id_local },
          data: {
            nombre: data.nombre ?? undefined,
            direccion: data.direccion ?? undefined,
            ciudad: data.ciudad ?? undefined,
            latitud: latStr ?? undefined,
            longitud: lngStr ?? undefined,
          },
        });

        // 2) Agregar nuevas imágenes (BD guarda SOLO url_imagen)
        if (subidas.length) {
          await tx.imagen.createMany({
            data: subidas.map((s) => ({
              url_imagen: s.url,
              localId: id_local,
            })),
          });
        }

        // 3) Eliminar imágenes por id (si hay)
        if (data.eliminar_imagen_ids?.length) {
          await tx.imagen.deleteMany({
            where: { id_imagen: { in: data.eliminar_imagen_ids }, localId: id_local },
          });
        }

        // 4) Vista actualizada
        const local = await tx.local.findUnique({
          where: { id_local },
          select: {
            id_local: true,
            nombre: true,
            direccion: true,
            ciudad: true,
            latitud: true,
            longitud: true,
            imagenes: {
              select: { id_imagen: true, url_imagen: true, fecha_creacion: true },
              orderBy: { id_imagen: "asc" },
            },
          },
        });
        if (!local) throw new Error("No se pudo recuperar el local.");

        const google_maps_url = buildGoogleMapsUrl(
          local.latitud ? String(local.latitud) : null,
          local.longitud ? String(local.longitud) : null
        );

        return {
          message: "Datos del local actualizados correctamente.",
          local: {
            id_local: local.id_local,
            nombre: local.nombre,
            direccion: local.direccion,
            ciudad: local.ciudad,
            ubicacion: { google_maps_url },
            imagenes: local.imagenes,
          },
        };
      });

      return actualizado;
    } catch (e) {
      // Limpieza de imágenes recién subidas si falla
      await eliminarImagenesCloudinary(publicIds).catch(() => undefined);
      throw e;
    }
  },
};
