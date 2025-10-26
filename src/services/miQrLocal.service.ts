// src/services/miQrLocal.service.ts
import prisma from "../config/database";
import { ImagenEntrada, eliminarImagenesCloudinary, subirImagenACloudinary } from "../utils/cloudinary";
import { ENV } from "../utils/env";

type LocalBasico = { id_local: number; qr_pago_url: string | null };

/** Obtiene el único local del propietario (o lanza error controlado). */
async function obtenerUnicoLocalDelUsuario(idUsuario: number): Promise<LocalBasico> {
  const locales = await prisma.local.findMany({
    where: { id_usuario_admin: idUsuario },
    select: { id_local: true, qr_pago_url: true },
  });

  if (locales.length === 0) {
    const err: any = new Error("No tienes un local.");
    err.code = "NO_LOCAL";
    throw err;
  }
  if (locales.length > 1) {
    const err: any = new Error("Tienes más de un local. Contacta soporte.");
    err.code = "VARIOS_LOCALES";
    throw err;
  }
  return locales[0];
}

/** Extrae public_id de una URL de Cloudinary (best-effort). */
function extraerPublicIdDeUrl(url: string): string | null {
  try {
    // Formato típico:
    // https://res.cloudinary.com/<cloud>/image/upload/v1699999999/carpeta/subcarpeta/archivo.jpg
    const upIdx = url.indexOf("/upload/");
    if (upIdx === -1) return null;
    let tail = url.slice(upIdx + "/upload/".length);
    // quitar "v1234567890/" si existe
    tail = tail.replace(/^v\d+\/+/, "");
    // quitar querystring
    tail = tail.split("?")[0];
    // quitar extensión (.jpg, .png...)
    tail = tail.replace(/\.[a-z0-9]+$/i, "");
    return tail || null;
  } catch {
    return null;
  }
}

/** GET: retorna la URL actual (o null) del QR del local del propietario. */
export async function obtenerMiQr(idUsuario: number): Promise<{ id_local: number; qr_url: string | null }> {
  const local = await obtenerUnicoLocalDelUsuario(idUsuario);
  return { id_local: local.id_local, qr_url: local.qr_pago_url };
}

/** PUT: sube/actualiza el QR y devuelve la URL final. */
export async function actualizarMiQr(idUsuario: number, img: ImagenEntrada): Promise<{ id_local: number; qr_url: string }> {
  const local = await obtenerUnicoLocalDelUsuario(idUsuario);

  // Subir nueva imagen
  const subida = await subirImagenACloudinary(img, `qr/local_${local.id_local}`);

  // Intentar eliminar imagen anterior (si estaba en Cloudinary y podemos inferir public_id)
  if (local.qr_pago_url) {
    const publicIdPrev = extraerPublicIdDeUrl(local.qr_pago_url);
    if (publicIdPrev) {
      try {
        await eliminarImagenesCloudinary([publicIdPrev]);
      } catch {
        // silencio: si falla la limpieza no bloqueamos la actualización
      }
    }
  }

  // Guardar nueva URL
  const actualizado = await prisma.local.update({
    where: { id_local: local.id_local },
    data: { qr_pago_url: subida.url },
    select: { id_local: true, qr_pago_url: true },
  });

  return { id_local: actualizado.id_local, qr_url: actualizado.qr_pago_url! };
}

/** DELETE: elimina el QR (pone null) e intenta borrar en Cloudinary. */
export async function eliminarMiQr(idUsuario: number): Promise<{ id_local: number; qr_url: null }> {
  const local = await obtenerUnicoLocalDelUsuario(idUsuario);

  if (local.qr_pago_url) {
    const publicId = extraerPublicIdDeUrl(local.qr_pago_url);
    if (publicId) {
      try {
        await eliminarImagenesCloudinary([publicId]);
      } catch {
        // no bloquear si no se puede eliminar en cloud
      }
    }
  }

  const actualizado = await prisma.local.update({
    where: { id_local: local.id_local },
    data: { qr_pago_url: null },
    select: { id_local: true, qr_pago_url: true },
  });

  return { id_local: actualizado.id_local, qr_url: null };
}
