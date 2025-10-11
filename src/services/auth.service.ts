import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { LoginRequestDTO, LoginResponseDTO } from '../types/auth';
import { signToken } from '../utils/jwt';

export const AuthService = {
  async login({ correo, password }: LoginRequestDTO): Promise<LoginResponseDTO> {
    const user = await prisma.usuario.findUnique({
      where: { correo },
      select: {
        id_usuario: true,
        correo: true,
        password: true,
        nombre: true,
        primer_apellido: true,
        segundo_apellido: true,
        rol: true,
        estado: true,
      },
    });

    // Mensaje genérico por seguridad (no revelar si el correo existe)
    if (!user || !user.password) {
      await simulateConstantTimeDelay(); // mitigar timing attacks
      throw new Error('Credenciales inválidas');
    }

    if (user.estado !== 'ACTIVO') {
      throw new Error('Usuario inactivo');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new Error('Credenciales inválidas');
    }

    const nombreCompleto = [user.nombre, user.primer_apellido, user.segundo_apellido]
      .filter(Boolean)
      .join(' ')
      .trim();

    const { token, expiresIn } = signToken({
      id: user.id_usuario,
      correo: user.correo,
      rol: user.rol as any,
      nombreCompleto,
    });

    return {
      token,
      expiresIn,
      user: {
        id: user.id_usuario,
        correo: user.correo,
        nombreCompleto,
        rol: user.rol as any,
      },
    };
  },
};

// Evita que logins inválidos respondan demasiado rápido
async function simulateConstantTimeDelay() {
  const fake = '$2a$10$7u1e3y4z5x6w7v8u9t0r1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6jK'; // longitud bcrypt
  await bcrypt.compare('invalid', fake).catch(() => {});
}
