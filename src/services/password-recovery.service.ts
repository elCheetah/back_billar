// src/services/password-recovery.service.ts
import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { ENV } from '../utils/env';
import { enviarCorreoHTML } from '../utils/mailer';
import { resetEmailHTML } from '../templates/reset-email';
import { generarCodigoReset, normalizarCodigo } from '../utils/reset-code';
import { signResetToken, verifyResetToken } from '../utils/reset-jwt';

export const PasswordRecoveryService = {
  async enviarCodigo(correo: string) {
    // Busca usuario (mensaje neutro para evitar enumeración)
    const user = await prisma.usuario.findUnique({
      where: { correo },
      select: { id_usuario: true, nombre: true, primer_apellido: true, segundo_apellido: true, estado: true }
    });

    if (!user || user.estado !== 'ACTIVO') {
      // Respuesta genérica (no revelar si existe o no)
      return { message: 'Si el correo está registrado, te enviaremos un código de verificación.' };
    }

    // Genera código + hash y vencimiento
    const codigo = generarCodigoReset();             // p.ej., 418QZM
    const codeHash = await bcrypt.hash(codigo, 10);
    const expiresAt = new Date(Date.now() + ENV.RESET_CODE_EXPIRES_MIN * 60 * 1000);

    // (Opcional) invalidar resets anteriores activos del usuario
    await prisma.passwordReset.updateMany({
      where: { userId: user.id_usuario, usedAt: null },
      data: { usedAt: new Date() }
    });

    // Crea registro
    const reset = await prisma.passwordReset.create({
      data: {
        userId: user.id_usuario,
        codeHash,
        expiresAt
      },
      select: { id: true }
    });

    // Envío de correo HTML
    const nombre = [user.nombre, user.primer_apellido].filter(Boolean).join(' ');
    await enviarCorreoHTML(correo, 'Código para restablecer tu contraseña', resetEmailHTML(nombre, codigo, ENV.RESET_CODE_EXPIRES_MIN));

    return { message: 'Hemos enviado un código de verificación a tu correo.' };
  },

  async verificarCodigo(correo: string, codigoEntrada: string) {
    const user = await prisma.usuario.findUnique({
      where: { correo },
      select: { id_usuario: true }
    });
    if (!user) throw new Error('Código o correo inválido.');

    const reset = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id_usuario,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (!reset) throw new Error('El código ha expirado o no existe.');

    if (reset.attempts >= 5) {
      throw new Error('Demasiados intentos fallidos. Solicita un nuevo código.');
    }

    const codigo = normalizarCodigo(codigoEntrada);
    const ok = await bcrypt.compare(codigo, reset.codeHash);
    if (!ok) {
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } }
      });
      throw new Error('Código incorrecto.');
    }

    // Devuelve un token corto firmado con RESET_JWT_SECRET
    const resetToken = signResetToken({ uid: user.id_usuario, rid: reset.id });
    return { message: 'Código verificado. Continúa con el cambio de contraseña.', resetToken };
  },

  async cambiarPassword(args: { correo: string; codigo: string; password: string; resetToken: string }) {
    const { correo, codigo: codigoEntrada, password, resetToken } = args;

    // Valida token corto (enviado en paso 2)
    const payload = verifyResetToken(resetToken);
    const { uid, rid } = payload;

    const user = await prisma.usuario.findUnique({ where: { id_usuario: uid } });
    if (!user || user.correo !== correo) throw new Error('Solicitud inválida.');

    const reset = await prisma.passwordReset.findUnique({ where: { id: rid } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new Error('El código ha expirado o ya fue utilizado.');
    }

    // Verifica el código nuevamente (defensa en profundidad)
    const codigo = normalizarCodigo(codigoEntrada);
    const ok = await bcrypt.compare(codigo, reset.codeHash);
    if (!ok) throw new Error('Código inválido.');

    // Actualiza password del usuario
    const hash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id_usuario: uid },
        data: { password: hash }
      }),
      prisma.passwordReset.update({
        where: { id: rid },
        data: { usedAt: new Date() }
      }),
      // Limpia otros resets abiertos del usuario
      prisma.passwordReset.updateMany({
        where: { userId: uid, usedAt: null, id: { not: rid } },
        data: { usedAt: new Date() }
      })
    ]);

    return { message: 'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.' };
  }
};
