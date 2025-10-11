import prisma from '../config/database';
import {
  ImagenEntrada,
  subirMultiplesImagenesACloudinary
  // eliminarImagenesCloudinary // ← opcional si luego guardas public_id en BD
} from '../utils/cloudinary';

type TipoMesa = 'POOL' | 'CARAMBOLA' | 'SNOOKER' | 'MIXTO';

export interface CrearMesaDTO {
  localId: number;
  numero_mesa: number;
  tipo_mesa: TipoMesa;
  descripcion?: string | null;
  imagenes?: ImagenEntrada[];
}

export interface ActualizarMesaDTO {
  id_mesa: number;
  numero_mesa?: number;
  tipo_mesa?: TipoMesa;
  descripcion?: string | null;
  agregar_imagenes?: ImagenEntrada[];
  eliminar_imagen_ids?: number[]; // ids de tabla Imagen
}

async function assertLocalOwnedByUser(localId: number, userId: number) {
  const local = await prisma.local.findFirst({
    where: { id_local: localId, id_usuario_admin: userId }
  });
  if (!local) {
    throw new Error('No tienes permisos sobre el local indicado.');
  }
}

async function assertMesaOwnedByUser(mesaId: number, userId: number) {
  const mesa = await prisma.mesa.findFirst({
    where: {
      id_mesa: mesaId,
      local: { id_usuario_admin: userId }
    },
    select: { id_mesa: true, id_local: true }
  });
  if (!mesa) {
    throw new Error('No tienes permisos sobre la mesa indicada.');
  }
  return mesa;
}

export const MesasService = {
  // crear mesa
  async crear(data: CrearMesaDTO, userId: number) {
    // 1) Propiedad del local
    await assertLocalOwnedByUser(data.localId, userId);

    // 2) Unicidad numero_mesa en el local
    const repetida = await prisma.mesa.findFirst({
      where: { id_local: data.localId, numero_mesa: data.numero_mesa, estado: { not: 'INACTIVO' } }
    });
    if (repetida) {
      throw new Error('Ya existe una mesa con ese número en el local.');
    }

    // 3) Subir imágenes (opcional)
    const { subidas } = await subirMultiplesImagenesACloudinary(data.imagenes, 'mesas');

    // 4) Crear
    const creada = await prisma.$transaction(async (tx) => {
      const mesa = await tx.mesa.create({
        data: {
          id_local: data.localId,
          numero_mesa: data.numero_mesa,
          tipo_mesa: data.tipo_mesa,
          descripcion: data.descripcion ?? null
        },
        select: { id_mesa: true, id_local: true, numero_mesa: true, tipo_mesa: true, descripcion: true, estado: true }
      });

      if (subidas.length) {
        await tx.imagen.createMany({
          data: subidas.map((img) => ({
            url_imagen: img.url,
            mesaId: mesa.id_mesa
          }))
        });
      }

      return mesa;
    });

    return { message: 'Mesa creada correctamente.', mesa: creada };
  },

  // listar mesas del local
  async listarPorLocal(localId: number, userId: number, page = 1, pageSize = 10) {
    await assertLocalOwnedByUser(localId, userId);

    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.mesa.count({ where: { id_local: localId, estado: { not: 'INACTIVO' } } }),
      prisma.mesa.findMany({
        where: { id_local: localId, estado: { not: 'INACTIVO' } },
        include: { imagenes: { select: { id_imagen: true, url_imagen: true } } },
        orderBy: { numero_mesa: 'asc' },
        skip,
        take: pageSize
      })
    ]);

    return {
      total,
      page,
      pageSize,
      data
    };
  },

  // obtener una mesa
  async obtener(idMesa: number, userId: number) {
    await assertMesaOwnedByUser(idMesa, userId);

    const mesa = await prisma.mesa.findUnique({
      where: { id_mesa: idMesa },
      include: { imagenes: { select: { id_imagen: true, url_imagen: true } } }
    });

    if (!mesa || mesa.estado === 'INACTIVO') {
      throw new Error('Mesa no encontrada o inactiva.');
    }

    return mesa;
  },

  // actualizar mesa
  async actualizar(data: ActualizarMesaDTO, userId: number) {
    const mesa = await assertMesaOwnedByUser(data.id_mesa, userId);

    // Si cambia numero_mesa, validar unicidad
    if (typeof data.numero_mesa === 'number') {
      const repetida = await prisma.mesa.findFirst({
        where: {
          id_local: mesa.id_local,
          numero_mesa: data.numero_mesa,
          id_mesa: { not: data.id_mesa },
          estado: { not: 'INACTIVO' }
        }
      });
      if (repetida) {
        throw new Error('Ya existe otra mesa con ese número en el mismo local.');
      }
    }

    // Subir nuevas imágenes si llegan
    const { subidas } = await subirMultiplesImagenesACloudinary(data.agregar_imagenes, 'mesas');

    const actualizada = await prisma.$transaction(async (tx) => {
      const upd = await tx.mesa.update({
        where: { id_mesa: data.id_mesa },
        data: {
          numero_mesa: typeof data.numero_mesa === 'number' ? data.numero_mesa : undefined,
          tipo_mesa: data.tipo_mesa ?? undefined,
          descripcion: data.descripcion !== undefined ? data.descripcion : undefined
        },
        include: { imagenes: { select: { id_imagen: true, url_imagen: true } } }
      });

      // Agregar imágenes
      if (subidas.length) {
        await tx.imagen.createMany({
          data: subidas.map((img) => ({
            url_imagen: img.url,
            mesaId: data.id_mesa
          }))
        });
      }

      // Eliminar imágenes por id (solo de la misma mesa)
      if (data.eliminar_imagen_ids?.length) {
        await tx.imagen.deleteMany({
          where: { id_imagen: { in: data.eliminar_imagen_ids }, mesaId: data.id_mesa }
        });

        // Nota: Para borrar también en Cloudinary se requiere guardar public_id en BD.
        // Con solo la URL no es confiable reconstruirlo.
        // TODO (opcional): extender el modelo Imagen con `public_id` y eliminar en Cloudinary aquí.
      }

      return upd;
    });

    return { message: 'Mesa actualizada correctamente.', mesa: actualizada };
  },

  // eliminar (soft delete)
  async eliminar(idMesa: number, userId: number) {
    await assertMesaOwnedByUser(idMesa, userId);

    await prisma.mesa.update({
      where: { id_mesa: idMesa },
      data: { estado: 'INACTIVO' }
    });

    return { message: 'Mesa eliminada (inactivada) correctamente.' };
  }
};
