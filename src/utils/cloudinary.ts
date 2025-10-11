import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { ENV } from './env';

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
  secure: true
});

export type ImagenEntrada = {
  base64?: string | null;      // data URI o base64 (del front)
  url_remota?: string | null;  // URL pública accesible (opcional)
};

export type ImagenSalida = {
  url: string;       // 👈 esto es lo que se guarda en BD
  public_id: string; // útil para rollback
};

const baseOptions: UploadApiOptions = {
  folder: ENV.CLOUDINARY_FOLDER || 'billar',
  resource_type: 'image',
  overwrite: false
};

export async function subirImagenACloudinary(img: ImagenEntrada, subcarpeta: string): Promise<ImagenSalida> {
  const source = img.base64 || img.url_remota;
  if (!source) throw new Error('No se envió contenido de imagen (base64 o url_remota).');

  const opts: UploadApiOptions = { ...baseOptions };
  if (subcarpeta) opts.folder = `${baseOptions.folder}/${subcarpeta}`;

  const res: UploadApiResponse = await cloudinary.uploader.upload(source, opts);
  return { url: res.secure_url, public_id: res.public_id };
}

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

// (Opcional) si guardas public_id en BD, podrías exponer un eliminador aquí.
export async function eliminarImagenesCloudinary(publicIds: string[]): Promise<void> {
  if (!publicIds.length) return;
  await cloudinary.api.delete_resources(publicIds);
}
