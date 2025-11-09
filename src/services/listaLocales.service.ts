// src/services/listaLocales.service.ts
import prisma from "../config/database";
import { enviarCorreoHTML } from "../utils/mailer";
import { localStatusEmailHTML, accountStatusEmailHTML } from "../templates/estado-email";

export type LocalListadoDTO = {
  id_local: number;
  nombre_local: string;
  direccion: string;
  estado: "ACTIVO" | "SUSPENDIDO";
  id_duenio: number;
  nombre_duenio: string;
  celular_duenio: string | null;
};

export async function listarLocales(): Promise<LocalListadoDTO[]> {
  const rows = await prisma.local.findMany({
    select: {
      id_local: true,
      nombre: true,
      direccion: true,
      estado: true,
      admin: {
        select: {
          id_usuario: true,
          nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
          celular: true,
          correo: true,
        },
      },
    },
    orderBy: [{ nombre: "asc" }],
  });

  return rows.map((l) => ({
    id_local: l.id_local,
    nombre_local: l.nombre,
    direccion: l.direccion,
    estado: l.estado === "ACTIVO" ? "ACTIVO" : "SUSPENDIDO",
    id_duenio: l.admin.id_usuario,
    nombre_duenio: `${l.admin.primer_apellido}${l.admin.segundo_apellido ? " " + l.admin.segundo_apellido : ""} ${l.admin.nombre}`,
    celular_duenio: l.admin.celular ?? null,
  }));
}

/**
 * Regla:
 *  - Activar local → activar también al dueño.
 *  - Suspender local → suspender también al dueño.
 */
export async function cambiarEstadoLocal(idLocal: number, activar: boolean) {
  return await prisma.$transaction(async (tx) => {
    const local = await tx.local.findUnique({
      where: { id_local: idLocal },
      select: {
        id_local: true,
        nombre: true,
        estado: true,
        admin: { select: { id_usuario: true, nombre: true, primer_apellido: true, segundo_apellido: true, correo: true, estado: true } },
      },
    });
    if (!local) throw new Error("Local no encontrado.");

    const nuevoEstado = activar ? "ACTIVO" : "INACTIVO";

    await tx.local.update({ where: { id_local: idLocal }, data: { estado: nuevoEstado } });
    await tx.usuario.update({ where: { id_usuario: local.admin.id_usuario }, data: { estado: nuevoEstado } });

    const nombreDuenio = `${local.admin.primer_apellido}${local.admin.segundo_apellido ? " " + local.admin.segundo_apellido : ""} ${local.admin.nombre}`;

    const htmlLocal = localStatusEmailHTML(nombreDuenio, local.nombre, activar);
    await enviarCorreoHTML(local.admin.correo, activar ? "Local reactivado" : "Local suspendido", htmlLocal);

    // correo sobre estado de cuenta (misma acción) para que quede constancia
    const htmlCuenta = accountStatusEmailHTML(nombreDuenio, activar);
    await enviarCorreoHTML(local.admin.correo, activar ? "Cuenta reactivada" : "Cuenta suspendida", htmlCuenta);

    return { id_local: idLocal, estado: nuevoEstado, id_duenio: local.admin.id_usuario };
  });
}
