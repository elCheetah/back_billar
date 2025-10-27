import prisma from "../config/database";
import { $Enums } from "@prisma/client";
import {
  subirMultiplesImagenesACloudinary,
  ImagenEntrada,
  eliminarImagenesCloudinary,
} from "../utils/cloudinary";

type TipoMesa = "POOL" | "CARAMBOLA" | "SNOOKER" | "MIXTO";

interface CrearMesaDTO {
  numero_mesa: number;
  tipo_mesa: TipoMesa;
  precio_hora: number;
  descripcion?: string | null;
  // Aceptamos: string[] (dataURI) o {base64:string}[]
  imagenes?: Array<string | { base64: string }>;
}

interface ActualizarMesaDTO {
  numero_mesa?: number;
  tipo_mesa?: TipoMesa;
  precio_hora?: number;
  descripcion?: string | null;
  agregar_imagenes?: Array<string | { base64: string }>;
  eliminar_imagen_ids?: number[];
}

/** Normaliza entrada a ImagenEntrada[] con base64 */
function normalizarImagenesBase64(arr?: Array<string | { base64: string }>): ImagenEntrada[] {
  if (!arr?.length) return [];
  return arr.map((it) =>
    typeof it === "string" ? { base64: it } : { base64: it.base64 }
  );
}

export const MesasService = {
  /** 1:1 local-usuario: obtenemos el local del usuario logueado */
  async getLocalByUser(userId: number) {
    const local = await prisma.local.findFirst({
      where: { id_usuario_admin: userId, estado: "ACTIVO" },
      select: { id_local: true },
    });
    if (!local) throw new Error("El usuario no tiene un local activo registrado.");
    return local;
  },

  /** Listar mesas (propias) con imágenes */
  async listarPorUsuario(userId: number) {
    const { id_local } = await this.getLocalByUser(userId);

    const mesas = await prisma.mesa.findMany({
      where: { id_local },
      include: { imagenes: true },
      orderBy: [{ estado: "asc" }, { numero_mesa: "asc" }],
    });

    return mesas;
  },

  /** Crear mesa + subir N imágenes base64 -> guardar solo URLs */
  async crear(userId: number, data: CrearMesaDTO) {
    const { id_local } = await this.getLocalByUser(userId);

    const repetida = await prisma.mesa.findFirst({
      where: { id_local, numero_mesa: data.numero_mesa },
      select: { id_mesa: true },
    });
    if (repetida) throw new Error("Ya existe una mesa con ese número en el local.");

    const imagenesEntrada: ImagenEntrada[] = normalizarImagenesBase64(data.imagenes);
    const { subidas, publicIds } = await subirMultiplesImagenesACloudinary(imagenesEntrada, "mesas");

    try {
      const mesa = await prisma.mesa.create({
        data: {
          id_local,
          numero_mesa: data.numero_mesa,
          tipo_mesa: data.tipo_mesa,
          precio_hora: data.precio_hora,
          descripcion: data.descripcion ?? null,
          estado: $Enums.EstadoMesa.DISPONIBLE,
          imagenes: subidas.length
            ? {
                createMany: {
                  data: subidas.map((s) => ({ url_imagen: s.url })),
                },
              }
            : undefined,
        },
        include: { imagenes: true },
      });

      return { message: "Mesa creada correctamente.", mesa };
    } catch (e) {
      // Si falló la creación de mesa, intentamos rollback de recursos recién subidos
      await eliminarImagenesCloudinary(publicIds).catch(() => undefined);
      throw e;
    }
  },

  /** Actualizar datos + agregar/eliminar imágenes (mismo request) */
  async actualizar(userId: number, idMesa: number, data: ActualizarMesaDTO) {
    const { id_local } = await this.getLocalByUser(userId);

    const mesa = await prisma.mesa.findFirst({
      where: { id_mesa: idMesa, id_local },
      select: { id_mesa: true, numero_mesa: true },
    });
    if (!mesa) throw new Error("Mesa no encontrada o no pertenece a su local.");

    if (data.numero_mesa && data.numero_mesa !== mesa.numero_mesa) {
      const repetida = await prisma.mesa.findFirst({
        where: { id_local, numero_mesa: data.numero_mesa },
        select: { id_mesa: true },
      });
      if (repetida) throw new Error("Ya existe otra mesa con ese número.");
    }

    const imagenesEntrada: ImagenEntrada[] = normalizarImagenesBase64(data.agregar_imagenes);
    const { subidas, publicIds } = await subirMultiplesImagenesACloudinary(imagenesEntrada, "mesas");

    try {
      const actualizada = await prisma.$transaction(async (tx) => {
        // 1) Actualizar atributos de mesa
        await tx.mesa.update({
          where: { id_mesa: idMesa },
          data: {
            numero_mesa: data.numero_mesa ?? undefined,
            tipo_mesa: data.tipo_mesa ?? undefined,
            descripcion: data.descripcion ?? undefined,
            precio_hora: data.precio_hora ?? undefined,
          },
        });

        // 2) Agregar nuevas imágenes subidas (si hay)
        if (subidas.length) {
          await tx.imagen.createMany({
            data: subidas.map((img) => ({
              url_imagen: img.url,
              mesaId: idMesa,
            })),
          });
        }

        // 3) Eliminar imágenes seleccionadas (si hay)
        if (data.eliminar_imagen_ids?.length) {
          await tx.imagen.deleteMany({
            where: { id_imagen: { in: data.eliminar_imagen_ids }, mesaId: idMesa },
          });
          // Nota: No eliminamos desde Cloudinary porque no guardamos public_id en BD
        }

        // 4) Devolver mesa con imágenes actualizadas
        return tx.mesa.findUnique({
          where: { id_mesa: idMesa },
          include: { imagenes: true },
        });
      });

      return { message: "Mesa actualizada correctamente.", mesa: actualizada };
    } catch (e) {
      // Si falló la transacción, intentamos limpiar las imágenes recién subidas
      await eliminarImagenesCloudinary(publicIds).catch(() => undefined);
      throw e;
    }
  },

  /** Cambiar estado (habilitar / inhabilitar / etc.) */
  async cambiarEstado(userId: number, idMesa: number, nuevoEstado: string) {
    const { id_local } = await this.getLocalByUser(userId);

    const existe = await prisma.mesa.findFirst({
      where: { id_mesa: idMesa, id_local },
      select: { id_mesa: true },
    });
    if (!existe) throw new Error("Mesa no encontrada o no pertenece a su local.");

    const estadoEnum = nuevoEstado as $Enums.EstadoMesa;

    const mesa = await prisma.mesa.update({
      where: { id_mesa: idMesa },
      data: { estado: estadoEnum },
      include: { imagenes: true },
    });

    return {
      message:
        estadoEnum === $Enums.EstadoMesa.INACTIVO
          ? "Mesa inhabilitada correctamente."
          : "Mesa habilitada/actualizada de estado correctamente.",
      mesa,
    };
  },

  /** Eliminar mesa (lógico o físico) */
  async eliminar(userId: number, idMesa: number, tipo: "LOGICO" | "FISICO" = "LOGICO") {
    const { id_local } = await this.getLocalByUser(userId);

    const mesa = await prisma.mesa.findFirst({
      where: { id_mesa: idMesa, id_local },
      select: { id_mesa: true },
    });
    if (!mesa) throw new Error("Mesa no encontrada o no pertenece a su local.");

    const total = await prisma.mesa.count({ where: { id_local } });
    if (tipo === "FISICO" && total <= 1) {
      throw new Error("No se puede eliminar: el local debe tener al menos una mesa.");
    }

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
