import prisma from '../config/database';
import {
    ImagenEntrada,
    subirMultiplesImagenesACloudinary
} from '../utils/cloudinary';

type TipoMesa = 'POOL' | 'CARAMBOLA' | 'SNOOKER' | 'MIXTO';

export interface CrearMesaDTO {
    localId: number;
    numero_mesa: number;
    tipo_mesa: TipoMesa;
    precio_hora: number;
    descripcion?: string | null;
    imagenes?: ImagenEntrada[];
}

export interface ActualizarMesaDTO {
    id_mesa: number;
    numero_mesa?: number;
    tipo_mesa?: TipoMesa;
    precio_hora?: number;
    descripcion?: string | null;
    agregar_imagenes?: ImagenEntrada[];
    eliminar_imagen_ids?: number[];
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
        select: { id_mesa: true, id_local: true, estado: true }
    });
    if (!mesa || mesa.estado === 'INACTIVO') {
        throw new Error('Mesa no encontrada o inactiva, o sin permisos.');
    }
    return mesa;
}

export const MesasService = {
    async crear(data: CrearMesaDTO, userId: number) {
        await assertLocalOwnedByUser(data.localId, userId);

        const repetida = await prisma.mesa.findFirst({
            where: { id_local: data.localId, numero_mesa: data.numero_mesa, estado: { not: 'INACTIVO' } }
        });
        if (repetida) {
            throw new Error('Ya existe una mesa con ese número en el local.');
        }

        const { subidas } = await subirMultiplesImagenesACloudinary(data.imagenes, 'mesas');

        const creada = await prisma.$transaction(async (tx) => {
            const mesa = await tx.mesa.create({
                data: {
                    id_local: data.localId,
                    numero_mesa: data.numero_mesa,
                    tipo_mesa: data.tipo_mesa,
                    descripcion: data.descripcion ?? null,
                    precio_hora: data.precio_hora
                },
                select: { id_mesa: true, id_local: true, numero_mesa: true, tipo_mesa: true, descripcion: true, estado: true, precio_hora: true }
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

    async listarPorLocal(localId: number, userId: number) {
        await assertLocalOwnedByUser(localId, userId);

        const mesas = await prisma.mesa.findMany({
            where: { id_local: localId, estado: { not: 'INACTIVO' } },
            include: { imagenes: { select: { id_imagen: true, url_imagen: true } } },
            orderBy: { numero_mesa: 'asc' }
        });

        return mesas;
    },

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

    async actualizar(data: ActualizarMesaDTO, userId: number) {
        const mesa = await assertMesaOwnedByUser(data.id_mesa, userId);

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
                throw new Error('Ya existe otra mesa con ese número en el local.');
            }
        }

        const { subidas } = await subirMultiplesImagenesACloudinary(data.agregar_imagenes, 'mesas');

        const actualizada = await prisma.$transaction(async (tx) => {
            const upd = await tx.mesa.update({
                where: { id_mesa: data.id_mesa },
                data: {
                    numero_mesa: typeof data.numero_mesa === 'number' ? data.numero_mesa : undefined,
                    tipo_mesa: data.tipo_mesa ?? undefined,
                    descripcion: data.descripcion !== undefined ? data.descripcion : undefined,
                    precio_hora: typeof data.precio_hora === 'number' ? data.precio_hora : undefined
                },
                include: { imagenes: { select: { id_imagen: true, url_imagen: true } } }
            });

            if (subidas.length) {
                await tx.imagen.createMany({
                    data: subidas.map((img) => ({
                        url_imagen: img.url,
                        mesaId: data.id_mesa
                    }))
                });
            }

            if (data.eliminar_imagen_ids?.length) {
                await tx.imagen.deleteMany({
                    where: { id_imagen: { in: data.eliminar_imagen_ids }, mesaId: data.id_mesa }
                });
            }

            return upd;
        });

        return { message: 'Mesa actualizada correctamente.', mesa: actualizada };
    },

    async eliminar(idMesa: number, userId: number) {
        await assertMesaOwnedByUser(idMesa, userId);

        await prisma.mesa.update({
            where: { id_mesa: idMesa },
            data: { estado: 'INACTIVO' }
        });

        return { message: 'Mesa inactivada correctamente.' };
    }
};
