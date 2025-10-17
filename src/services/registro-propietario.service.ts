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
    gps_url: string;
    imagenes?: ImagenEntrada[];
  };
  mesas: {
    numero_mesa: number;
    tipo_mesa: TipoMesa;
    precio_hora: number;
    descripcion?: string | null;
    imagenes?: ImagenEntrada[];
  }[];
}

export const RegistroPropietarioService = {
  async registrar(data: RegistroPropietarioDTO) {
    const correoExistente = await prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (correoExistente) {
      throw new Error('El correo ya está registrado. Usa un correo diferente.');
    }

    const segundoApeInput = data.segundo_apellido?.trim() || null;
    const whereNombre: any = {
      rol: 'PROPIETARIO',
      nombre: { equals: data.nombre.trim(), mode: 'insensitive' },
      primer_apellido: { equals: data.primer_apellido.trim(), mode: 'insensitive' },
      ...(segundoApeInput
        ? { segundo_apellido: { equals: segundoApeInput, mode: 'insensitive' } }
        : { OR: [{ segundo_apellido: null }, { segundo_apellido: '' }] })
    };

    const persona = await prisma.usuario.findFirst({ where: whereNombre });
    if (persona) {
      throw new Error('La persona ya está registrada como PROPIETARIO.');
    }

    const coords = parseGpsFromUrl(data.local.gps_url);
    if (!coords) {
      throw new Error('La URL de GPS no tiene coordenadas válidas.');
    }
    const latStr = String(coords.lat);
    const lngStr = String(coords.lng);

    const rollbackPublicIds: string[] = [];

    const { subidas: imgsLocal, publicIds: idsLocal } =
      await subirMultiplesImagenesACloudinary(data.local.imagenes, 'locales');
    rollbackPublicIds.push(...idsLocal);

    const packMesasImgs: Array<{ index: number; subidas: { url: string; public_id: string }[] }> = [];
    const mesasInput = Array.isArray(data.mesas) ? data.mesas : [];
    for (const [i, mesa] of mesasInput.entries()) {
      const { subidas, publicIds } = await subirMultiplesImagenesACloudinary(mesa.imagenes, 'mesas');
      packMesasImgs.push({ index: i, subidas });
      rollbackPublicIds.push(...publicIds);
    }

    try {
      const usuario = await prisma.$transaction(async (tx) => {
        const hash = await bcrypt.hash(data.password, 10);

        const u = await tx.usuario.create({
          data: {
            nombre: data.nombre.trim(),
            primer_apellido: data.primer_apellido.trim(),
            segundo_apellido: segundoApeInput,
            correo: data.correo,
            password: hash,
            celular: data.celular?.trim() || null,
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
            latitud: latStr,
            longitud: lngStr,
            id_usuario_admin: u.id_usuario
          },
          select: { id_local: true }
        });

        if (imgsLocal.length) {
          await tx.imagen.createMany({
            data: imgsLocal.map((img) => ({
              url_imagen: img.url,
              localId: local.id_local
            }))
          });
        }

        for (const [i, mesa] of mesasInput.entries()) {
          const creada = await tx.mesa.create({
            data: {
              numero_mesa: mesa.numero_mesa,
              descripcion: mesa.descripcion ?? null,
              tipo_mesa: mesa.tipo_mesa,
              id_local: local.id_local,
              precio_hora: mesa.precio_hora
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
      await eliminarImagenesCloudinary(rollbackPublicIds);
      throw new Error('Error durante el registro. No se guardaron cambios.');
    }
  }
};
