import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';

export interface RegistroClienteDTO {
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string | null;
  correo: string;
  password: string;
  celular?: string | null;
}

export const RegistroClienteService = {
  async registrar(data: RegistroClienteDTO) {
    // 1️⃣ Validar correo único global
    const existente = await prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (existente) {
      const rolMsg = existente.rol === 'PROPIETARIO' ? 'como propietario' : 'como cliente';
      throw new Error(`El correo ya se encuentra registrado ${rolMsg}. Usa otro correo.`);
    }

    // 2️⃣ Hash de contraseña
    const hash = await bcrypt.hash(data.password, 10);

    // 3️⃣ Crear usuario con rol CLIENTE
    const usuario = await prisma.usuario.create({
      data: {
        nombre: data.nombre.trim(),
        primer_apellido: data.primer_apellido.trim(),
        segundo_apellido: data.segundo_apellido?.trim() ?? null,
        correo: data.correo,
        password: hash,
        celular: data.celular ?? null,
        rol: 'CLIENTE'
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

    // 4️⃣ Preparar token JWT
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
  }
};
