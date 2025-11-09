// src/services/listaUsuarios.service.ts
import prisma from "../config/database";
import { enviarCorreoHTML } from "../utils/mailer";
import { accountStatusEmailHTML } from "../templates/estado-email";

type UsuarioRow = {
  id_usuario: number;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  correo: string;
  celular: string | null;
  estado: "ACTIVO" | "INACTIVO";
};

export type UsuarioListadoDTO = {
  id_usuario: number;
  nombre_completo: string;
  celular: string | null;
  correo: string;
  estado: "ACTIVO" | "SUSPENDIDO";
};

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
  };
}

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

    await tx.usuario.update({
      where: { id_usuario: idUsuario },
      data: { estado: nuevoEstado },
    });

    if (user.rol === "PROPIETARIO") {
      await tx.local.updateMany({
        where: { id_usuario_admin: idUsuario },
        data: { estado: nuevoEstado },
      });
    }

    const nombreCompleto = `${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""} ${user.nombre}`;
    const html = accountStatusEmailHTML(nombreCompleto, activar);
    await enviarCorreoHTML(user.correo, activar ? "Cuenta reactivada" : "Cuenta suspendida", html);

    return { id_usuario: idUsuario, estado: nuevoEstado };
  });
}
