import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error('⚠️  Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

export type ImagenEntrada = {
  base64?: string | null;      // data URI o base64 plano (se recomienda data URI)
  url_remota?: string | null;  // URL pública accesible
};

export type ImagenSalida = {
  url: string;
  public_id: string;
};

const baseOptions: UploadApiOptions = {
  folder: CLOUDINARY_FOLDER || 'billar',
  resource_type: 'image',
  overwrite: false
};

/**
 * Sube UNA imagen a Cloudinary. Acepta `base64` (data URI recomendable) o `url_remota`.
 * Retorna { url, public_id }.
 */
export async function subirImagenACloudinary(img: ImagenEntrada, subcarpeta: string): Promise<ImagenSalida> {
  const source = img.base64 || img.url_remota;
  if (!source) {
    throw new Error('No se envió contenido de imagen (base64 o url_remota).');
  }

  const opts: UploadApiOptions = { ...baseOptions };
  if (subcarpeta) {
    opts.folder = `${baseOptions.folder}/${subcarpeta}`;
  }

  const res: UploadApiResponse = await cloudinary.uploader.upload(source, opts);
  return { url: res.secure_url, public_id: res.public_id };
}

/**
 * Sube muchas imágenes en paralelo y devuelve arrays de {url, public_id} y de public_ids por si quieres limpiar luego.
 */
export async function subirMultiplesImagenesACloudinary(
  imagenes: ImagenEntrada[] | undefined,
  subcarpeta: string
): Promise<{ subidas: ImagenSalida[]; publicIds: string[] }> {
  const validas = (imagenes || []).filter(Boolean);
  if (!validas.length) return { subidas: [], publicIds: [] };

  const subidas = await Promise.all(validas.map(img => subirImagenACloudinary(img, subcarpeta)));
  const publicIds = subidas.map(s => s.public_id);
  return { subidas, publicIds };
}

/**
 * Borra recursos por public_id (para rollback compensatorio si falla BD).
 */
export async function eliminarImagenesCloudinary(publicIds: string[]): Promise<void> {
  if (!publicIds.length) return;
  await cloudinary.api.delete_resources(publicIds);
}
