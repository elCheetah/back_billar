import prisma from "../config/database";
import { $Enums } from "@prisma/client";
import { subirMultiplesImagenesACloudinary, ImagenEntrada } from "../utils/cloudinary";

type TipoMesa = "POOL" | "CARAMBOLA" | "SNOOKER" | "MIXTO";

interface CrearMesaDTO {
  numero_mesa: number;
  tipo_mesa: TipoMesa;
  precio_hora: number;
  descripcion?: string | null;
  imagenes?: ImagenEntrada[];
}

export const MesasService = {
  /** 🔹 Obtener local del usuario logueado */
  async getLocalByUser(userId: number) {
    const local = await prisma.local.findFirst({
      where: { id_usuario_admin: userId, estado: "ACTIVO" },
    });
    if (!local) throw new Error("El usuario no tiene un local activo registrado.");
    return local;
  },

  /** 🔹 Listar mesas de su propio local */
  async listarPorUsuario(userId: number) {
    const local = await this.getLocalByUser(userId);

    const mesasActivas = await prisma.mesa.findMany({
      where: { id_local: local.id_local, estado: { not: "INACTIVO" } },
      include: { imagenes: true },
      orderBy: { numero_mesa: "asc" },
    });

    const mesasInactivas = await prisma.mesa.findMany({
      where: { id_local: local.id_local, estado: "INACTIVO" },
      include: { imagenes: true },
      orderBy: { numero_mesa: "asc" },
    });

    return [...mesasActivas, ...mesasInactivas];
  },

  /** 🔹 Crear nueva mesa */
  async crear(userId: number, data: CrearMesaDTO) {
    const local = await this.getLocalByUser(userId);

    const repetida = await prisma.mesa.findFirst({
      where: { id_local: local.id_local, numero_mesa: data.numero_mesa },
    });
    if (repetida) throw new Error("Ya existe una mesa con ese número en el local.");

    const { subidas } = await subirMultiplesImagenesACloudinary(data.imagenes, "mesas");

    const mesa = await prisma.mesa.create({
      data: {
        id_local: local.id_local,
        numero_mesa: data.numero_mesa,
        tipo_mesa: data.tipo_mesa,
        precio_hora: data.precio_hora,
        descripcion: data.descripcion ?? null,
        estado: $Enums.EstadoMesa.DISPONIBLE,
      },
    });

    if (subidas.length) {
      await prisma.imagen.createMany({
        data: subidas.map((img) => ({
          url_imagen: img.url,
          mesaId: mesa.id_mesa,
        })),
      });
    }

    return { message: "Mesa creada correctamente.", mesa };
  },

  /** 🔹 Actualizar mesa */
  async actualizar(userId: number, idMesa: number, data: any) {
    const local = await this.getLocalByUser(userId);

    const mesa = await prisma.mesa.findFirst({
      where: { id_mesa: idMesa, id_local: local.id_local },
    });
    if (!mesa) throw new Error("Mesa no encontrada o no pertenece a su local.");

    if (data.numero_mesa && data.numero_mesa !== mesa.numero_mesa) {
      const repetida = await prisma.mesa.findFirst({
        where: { id_local: local.id_local, numero_mesa: data.numero_mesa },
      });
      if (repetida) throw new Error("Ya existe otra mesa con ese número.");
    }

    const { subidas } = await subirMultiplesImagenesACloudinary(data.agregar_imagenes, "mesas");

    const actualizada = await prisma.$transaction(async (tx) => {
      const upd = await tx.mesa.update({
        where: { id_mesa: idMesa },
        data: {
          numero_mesa: data.numero_mesa ?? undefined,
          tipo_mesa: data.tipo_mesa ?? undefined,
          descripcion: data.descripcion ?? undefined,
          precio_hora: data.precio_hora ?? undefined,
        },
      });

      if (subidas.length) {
        await tx.imagen.createMany({
          data: subidas.map((img) => ({
            url_imagen: img.url,
            mesaId: idMesa,
          })),
        });
      }

      if (data.eliminar_imagen_ids?.length) {
        await tx.imagen.deleteMany({
          where: { id_imagen: { in: data.eliminar_imagen_ids }, mesaId: idMesa },
        });
      }

      return upd;
    });

    return { message: "Mesa actualizada correctamente.", mesa: actualizada };
  },

  /** 🔹 Cambiar estado (habilitar / inhabilitar) */
  async cambiarEstado(userId: number, idMesa: number, nuevoEstado: string) {
    const local = await this.getLocalByUser(userId);
    const mesa = await prisma.mesa.findFirst({
      where: { id_mesa: idMesa, id_local: local.id_local },
    });
    if (!mesa) throw new Error("Mesa no encontrada o no pertenece a su local.");

    // convertir a enum válido de Prisma
    const estadoEnum = nuevoEstado as $Enums.EstadoMesa;

    const actualizado = await prisma.mesa.update({
      where: { id_mesa: idMesa },
      data: { estado: estadoEnum },
    });

    return {
      message:
        estadoEnum === $Enums.EstadoMesa.INACTIVO
          ? "Mesa inhabilitada correctamente."
          : "Mesa habilitada correctamente.",
      mesa: actualizado,
    };
  },

  /** 🔹 Eliminar mesa (físico o lógico) */
  async eliminar(userId: number, idMesa: number, tipo: "LOGICO" | "FISICO" = "LOGICO") {
    const local = await this.getLocalByUser(userId);

    const mesa = await prisma.mesa.findFirst({
      where: { id_mesa: idMesa, id_local: local.id_local },
    });
    if (!mesa) throw new Error("Mesa no encontrada o no pertenece a su local.");

    const total = await prisma.mesa.count({ where: { id_local: local.id_local } });
    if (tipo === "FISICO" && total <= 1)
      throw new Error("No se puede eliminar: el local debe tener al menos una mesa.");

    if (tipo === "LOGICO") {
      await prisma.mesa.update({
        where: { id_mesa: idMesa },
        data: { estado: $Enums.EstadoMesa.INACTIVO },
      });
      return { message: "Mesa inactivada correctamente." };
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.imagen.deleteMany({ where: { mesaId: idMesa } });
        await tx.mesa.delete({ where: { id_mesa: idMesa } });
      });
      return { message: "Mesa eliminada permanentemente." };
    }
  },
};
