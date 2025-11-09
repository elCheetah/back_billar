// src/services/listaUsuarios.service.ts
import prisma from "../config/database";
import { enviarCorreoHTML } from "../utils/mailer";
import { accountStatusEmailHTML, localStatusEmailHTML } from "../templates/estado-email";

/** ========= Tipos base del row y del DTO ========= */
type UsuarioRow = {
  id_usuario: number;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  correo: string;
  celular: string | null;
  estado: "ACTIVO" | "INACTIVO";
  // Para propietarios: traer su (único) local
  locales?: { nombre: string }[];
};

export type UsuarioListadoDTO = {
  id_usuario: number;
  nombre_completo: string;
  celular: string | null;
  correo: string;
  estado: "ACTIVO" | "SUSPENDIDO";
  nombre_local?: string | null; // solo para propietarios
};

/** ========= Helpers ========= */
function fullName(u: UsuarioRow) {
  const ap2 = u.segundo_apellido ? ` ${u.segundo_apellido}` : "";
  return `${u.primer_apellido}${ap2} ${u.nombre}`.trim();
}

function mapListado(u: UsuarioRow): UsuarioListadoDTO {
  return {
    id_usuario: u.id_usuario,
    nombre_completo: fullName(u),
    celular: u.celular ?? null,
    correo: u.correo,
    estado: u.estado === "ACTIVO" ? "ACTIVO" : "SUSPENDIDO",
    nombre_local: u.locales?.[0]?.nombre ?? null,
  };
}

/** ========= Listados ========= */
export async function listarPropietarios(): Promise<UsuarioListadoDTO[]> {
  const rows = await prisma.usuario.findMany({
    where: { rol: "PROPIETARIO" },
    select: {
      id_usuario: true,
      nombre: true,
      primer_apellido: true,
      segundo_apellido: true,
      correo: true,
      celular: true,
      estado: true,
      // Trae el (único) local del propietario
      locales: { select: { nombre: true } },
    },
    orderBy: [{ primer_apellido: "asc" }, { segundo_apellido: "asc" }, { nombre: "asc" }],
  });
  return rows.map(mapListado);
}

export async function listarClientes(): Promise<UsuarioListadoDTO[]> {
  const rows = await prisma.usuario.findMany({
    where: { rol: "CLIENTE" },
    select: {
      id_usuario: true,
      nombre: true,
      primer_apellido: true,
      segundo_apellido: true,
      correo: true,
      celular: true,
      estado: true,
    },
    orderBy: [{ primer_apellido: "asc" }, { segundo_apellido: "asc" }, { nombre: "asc" }],
  });
  return rows.map(mapListado);
}

/** ========= Activar / Suspender =========
 *  - Cambia estado de usuario
 *  - Si es PROPIETARIO, también cambia el estado de su local
 *  - Envía email por cuenta y (si aplica) por local, con nombre del local
 */
export async function cambiarEstadoUsuario(idUsuario: number, activar: boolean) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.usuario.findUnique({
      where: { id_usuario: idUsuario },
      select: {
        id_usuario: true,
        nombre: true,
        primer_apellido: true,
        segundo_apellido: true,
        correo: true,
        rol: true,
      },
    });
    if (!user) throw new Error("Usuario no encontrado.");

    const nuevoEstado = activar ? "ACTIVO" : "INACTIVO";

    // 1) Actualiza estado del usuario
    await tx.usuario.update({
      where: { id_usuario: idUsuario },
      data: { estado: nuevoEstado },
    });

    // 2) Si es PROPIETARIO, actualizar su local y capturar el nombre
    let nombreLocal: string | null = null;
    if (user.rol === "PROPIETARIO") {
      const local = await tx.local.findFirst({
        where: { id_usuario_admin: idUsuario },
        select: { nombre: true },
      });
      nombreLocal = local?.nombre ?? null;

      await tx.local.updateMany({
        where: { id_usuario_admin: idUsuario },
        data: { estado: nuevoEstado },
      });
    }

    // 3) Envío de correos
    const nombreCompleto =
      `${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""} ${user.nombre}`.trim();

    // Correo por cuenta
    const htmlCuenta = accountStatusEmailHTML(nombreCompleto, activar);
    await enviarCorreoHTML(
      user.correo,
      activar ? "Cuenta reactivada" : "Cuenta suspendida",
      htmlCuenta
    );

    // Correo por local (solo propietarios y si existe local)
    if (user.rol === "PROPIETARIO" && nombreLocal) {
      const htmlLocal = localStatusEmailHTML(nombreCompleto, nombreLocal, activar);
      await enviarCorreoHTML(
        user.correo,
        activar ? `Local reactivado: ${nombreLocal}` : `Local suspendido: ${nombreLocal}`,
        htmlLocal
      );
    }

    // 4) Respuesta
    return {
      id_usuario: idUsuario,
      estado: nuevoEstado, // "ACTIVO" | "INACTIVO" (en front lo mapeas a ACTIVO/SUSPENDIDO si deseas)
      nombre_local: nombreLocal,
    };
  });
}
