import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';
import {
  ImagenEntrada,
  subirMultiplesImagenesACloudinary,
  eliminarImagenesCloudinary
} from '../utils/cloudinary';

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
    tipo_billar: 'POOL' | 'CARAMBOLA' | 'SNOOKER' | 'MIXTO';
    latitud?: any | null;
    longitud?: any | null;
    imagenes?: ImagenEntrada[];
  };
  mesas?: {
    numero_mesa: number;
    descripcion?: string | null;
    imagenes?: ImagenEntrada[];
  }[];
}

export const RegistroPropietarioService = {
  async registrar(data: RegistroPropietarioDTO) {
    // ✅ Correo único global
    const correoExistente = await prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (correoExistente) {
      throw new Error('El correo ya está registrado. Usa otro correo electrónico.');
    }

    // ✅ Nombre único solo entre propietarios
    const filtros: any = {
      rol: 'PROPIETARIO',
      nombre: { equals: data.nombre, mode: 'insensitive' },
      primer_apellido: { equals: data.primer_apellido, mode: 'insensitive' }
    };
    if (data.segundo_apellido && data.segundo_apellido.trim() !== '') {
      filtros.segundo_apellido = { equals: data.segundo_apellido, mode: 'insensitive' };
    } else {
      filtros.OR = [{ segundo_apellido: null }, { segundo_apellido: '' }];
    }

    const existePropietario = await prisma.usuario.findFirst({ where: filtros });
    if (existePropietario) {
      throw new Error('La persona ya está registrada como propietario.');
    }

    // ✅ Subir imágenes a Cloudinary
    const rollbackIds: string[] = [];
    const { subidas: imgsLocal, publicIds: idsLocal } =
      await subirMultiplesImagenesACloudinary(data.local.imagenes, 'locales');
    rollbackIds.push(...idsLocal);

    const mesasImgs: any[] = [];
    if (data.mesas?.length) {
      for (const [i, mesa] of data.mesas.entries()) {
        const { subidas, publicIds } = await subirMultiplesImagenesACloudinary(mesa.imagenes, 'mesas');
        mesasImgs.push({ index: i, subidas });
        rollbackIds.push(...publicIds);
      }
    }

    // ✅ Transacción completa
    try {
      const usuario = await prisma.$transaction(async (tx) => {
        const hash = await bcrypt.hash(data.password, 10);

        const nuevoUsuario = await tx.usuario.create({
          data: {
            nombre: data.nombre.trim(),
            primer_apellido: data.primer_apellido.trim(),
            segundo_apellido: data.segundo_apellido ?? '',
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

        const nuevoLocal = await tx.local.create({
          data: {
            nombre: data.local.nombre.trim(),
            direccion: data.local.direccion.trim(),
            ciudad: data.local.ciudad ?? 'Cochabamba',
            tipo_billar: data.local.tipo_billar,
            latitud: data.local.latitud ?? null,
            longitud: data.local.longitud ?? null,
            id_usuario_admin: nuevoUsuario.id_usuario
          },
          select: { id_local: true }
        });

        if (imgsLocal.length) {
          await tx.imagen.createMany({
            data: imgsLocal.map((img) => ({
              url_imagen: img.url,
              localId: nuevoLocal.id_local
            }))
          });
        }

        if (data.mesas?.length) {
          for (const [i, mesa] of data.mesas.entries()) {
            const mesaCreada = await tx.mesa.create({
              data: {
                numero_mesa: mesa.numero_mesa,
                descripcion: mesa.descripcion ?? null,
                id_local: nuevoLocal.id_local
              },
              select: { id_mesa: true }
            });

            const pack = mesasImgs.find((p) => p.index === i);
            if (pack?.subidas?.length) {
              await tx.imagen.createMany({
                data: pack.subidas.map((img: any) => ({
                  url_imagen: img.url,
                  mesaId: mesaCreada.id_mesa
                }))
              });
            }
          }
        }

        return nuevoUsuario;
      });

      const nombreCompleto = [usuario.nombre, usuario.primer_apellido, usuario.segundo_apellido]
        .filter(Boolean)
        .join(' ');
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
    } catch (error) {
      await eliminarImagenesCloudinary(rollbackIds);
      throw new Error('Ocurrió un error al registrar el propietario. Intenta nuevamente.');
    }
  }
};
