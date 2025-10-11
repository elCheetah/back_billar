import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';
import { parseGpsFromUrl } from '../utils/gps';
import {
  ImagenEntrada,
  subirMultiplesImagenesACloudinary,
  eliminarImagenesCloudinary
} from '../utils/cloudinary';

type TipoMesa = 'POOL' | 'CARAMBOLA' | 'SNOOKER' | 'MIXTO';

export interface RegistroPropietarioDTO {
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string | null;
  correo: string;
  password: string;
  celular?: string | null;
  local: {
    nombre: string;
    direccion: string;
    ciudad?: string | null;
    gps_url: string;            // <- llega del front
    imagenes?: ImagenEntrada[]; // opcional
  };
  mesas: {
    numero_mesa: number;
    tipo_mesa: TipoMesa;
    descripcion?: string | null;
    imagenes?: ImagenEntrada[];
  }[];
}

export const RegistroPropietarioService = {
  async registrar(data: RegistroPropietarioDTO) {
    // 1) Correo único global
    const correoExistente = await prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (correoExistente) {
      throw new Error('El correo ya está registrado. Utiliza un correo diferente.');
    }

    // 2) Unicidad de persona (solo entre propietarios), insensible a may/min
    const whereNombre: any = {
      rol: 'PROPIETARIO',
      nombre: { equals: data.nombre, mode: 'insensitive' },
      primer_apellido: { equals: data.primer_apellido, mode: 'insensitive' }
    };
    if (data.segundo_apellido && data.segundo_apellido.trim() !== '') {
      whereNombre.segundo_apellido = { equals: data.segundo_apellido, mode: 'insensitive' };
    } else {
      // permitir “sin segundo apellido”: coincide contra null o vacío
      whereNombre.OR = [{ segundo_apellido: null }, { segundo_apellido: '' }];
    }

    const persona = await prisma.usuario.findFirst({ where: whereNombre });
    if (persona) {
      throw new Error('La persona ya está registrada como PROPIETARIO en el sistema.');
    }

    // 3) Parsear lat/lng desde la URL de GPS
    const coords = parseGpsFromUrl(data.local.gps_url);
    if (!coords) {
      throw new Error('No se pudieron extraer coordenadas válidas desde la URL de GPS.');
    }

    // 4) Subir imágenes a Cloudinary primero (para fallar rápido si hay error de red)
    const rollbackPublicIds: string[] = [];

    const { subidas: imgsLocal, publicIds: idsLocal } =
      await subirMultiplesImagenesACloudinary(data.local.imagenes, 'locales');
    rollbackPublicIds.push(...idsLocal);

    const packMesasImgs: Array<{ index: number; subidas: { url: string; public_id: string }[] }> = [];
    for (const [i, mesa] of (data.mesas || []).entries()) {
      const { subidas, publicIds } = await subirMultiplesImagenesACloudinary(mesa.imagenes, 'mesas');
      packMesasImgs.push({ index: i, subidas });
      rollbackPublicIds.push(...publicIds);
    }

    // 5) Transacción total (usuario -> local -> mesas -> imágenes)
    try {
      const usuario = await prisma.$transaction(async (tx) => {
        const hash = await bcrypt.hash(data.password, 10);

        const u = await tx.usuario.create({
          data: {
            nombre: data.nombre.trim(),
            primer_apellido: data.primer_apellido.trim(),
            segundo_apellido: data.segundo_apellido?.trim() ?? '',
            correo: data.correo,
            password: hash,
            celular: data.celular ?? null,
            rol: 'PROPIETARIO'
          },
          select: {
            id_usuario: true,
            correo: true,
            nombre: true,
            primer_apellido: true,
            segundo_apellido: true,
            rol: true
          }
        });

        const local = await tx.local.create({
          data: {
            nombre: data.local.nombre.trim(),
            direccion: data.local.direccion.trim(),
            ciudad: (data.local.ciudad || 'Cochabamba').trim(),
            latitud: coords.lat,   // Prisma Decimal acepta string
            longitud: coords.lng,  // Prisma Decimal acepta string
            id_usuario_admin: u.id_usuario
          },
          select: { id_local: true }
        });

        // Imágenes del local
        if (imgsLocal.length) {
          await tx.imagen.createMany({
            data: imgsLocal.map((img) => ({
              url_imagen: img.url,
              localId: local.id_local
            }))
          });
        }

        // Mesas + imágenes por mesa
        for (const [i, mesa] of data.mesas.entries()) {
          const creada = await tx.mesa.create({
            data: {
              numero_mesa: mesa.numero_mesa,
              descripcion: mesa.descripcion ?? null,
              tipo_mesa: mesa.tipo_mesa,
              id_local: local.id_local
            },
            select: { id_mesa: true }
          });

          const fotos = packMesasImgs.find((p) => p.index === i)?.subidas || [];
          if (fotos.length) {
            await tx.imagen.createMany({
              data: fotos.map((img) => ({
                url_imagen: img.url,
                mesaId: creada.id_mesa
              }))
            });
          }
        }

        return u;
      });

      // 6) Token + respuesta
      const nombreCompleto = [usuario.nombre, usuario.primer_apellido, usuario.segundo_apellido]
        .filter(Boolean)
        .join(' ')
        .trim();

      const { token, expiresIn } = signToken({
        id: usuario.id_usuario,
        correo: usuario.correo,
        rol: usuario.rol as any,
        nombreCompleto
      });

      return {
        token,
        expiresIn,
        user: {
          id: usuario.id_usuario,
          correo: usuario.correo,
          nombreCompleto,
          rol: usuario.rol
        }
      };
    } catch (err) {
      // Si falla la BD, limpiamos lo subido a Cloudinary
      await eliminarImagenesCloudinary(rollbackPublicIds);
      throw new Error(
        'Ocurrió un error durante el registro. No se guardaron cambios. Intenta nuevamente o contacta soporte.'
      );
    }
  }
};
