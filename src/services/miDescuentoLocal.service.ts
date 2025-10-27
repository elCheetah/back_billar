import prisma from "../config/database";

type LocalDescuento = {
  id_local: number;
  descuento_global: number;
};

/** Obtiene el único local del propietario autenticado o lanza error controlado. */
async function obtenerUnicoLocalDelUsuario(idUsuario: number): Promise<LocalDescuento> {
  const locales = await prisma.local.findMany({
    where: { id_usuario_admin: idUsuario },
    select: { id_local: true, descuento_global: true },
  });

  if (locales.length === 0) {
    const err: any = new Error("No tienes un local registrado.");
    err.code = "NO_LOCAL";
    throw err;
  }
  if (locales.length > 1) {
    const err: any = new Error("Tienes más de un local registrado.");
    err.code = "VARIOS_LOCALES";
    throw err;
  }

  return {
    id_local: locales[0].id_local,
    descuento_global: Number(locales[0].descuento_global || 0),
  };
}

/** GET: obtiene el descuento actual. */
export async function obtenerMiDescuento(idUsuario: number): Promise<LocalDescuento> {
  return await obtenerUnicoLocalDelUsuario(idUsuario);
}

/** PUT: actualiza el descuento global (0–100). */
export async function actualizarMiDescuento(idUsuario: number, nuevoDescuento: number): Promise<LocalDescuento> {
  const local = await obtenerUnicoLocalDelUsuario(idUsuario);
  const actualizado = await prisma.local.update({
    where: { id_local: local.id_local },
    data: { descuento_global: nuevoDescuento },
    select: { id_local: true, descuento_global: true },
  });
  return {
    id_local: actualizado.id_local,
    descuento_global: Number(actualizado.descuento_global),
  };
}

/** DELETE: restablece el descuento (lo deja en 0). */
export async function restablecerMiDescuento(idUsuario: number): Promise<LocalDescuento> {
  const local = await obtenerUnicoLocalDelUsuario(idUsuario);
  const actualizado = await prisma.local.update({
    where: { id_local: local.id_local },
    data: { descuento_global: 0 },
    select: { id_local: true, descuento_global: true },
  });
  return {
    id_local: actualizado.id_local,
    descuento_global: 0,
  };
}
