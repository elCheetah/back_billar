import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ ok: false, message: 'No autorizado: token faltante o inválido.' });
    }

    const payload = verifyToken(token);
    req.user = {
      id: payload.id as number,
      correo: payload.correo as string,
      rol: payload.rol as any, // 'CLIENTE' | 'PROPIETARIO' | 'ADMINISTRADOR'
      nombreCompleto: (payload as any).nombreCompleto
    };

    return next();
  } catch {
    return res.status(401).json({ ok: false, message: 'No autorizado: token inválido o expirado.' });
  }
}

/**
 * Alias para mantener compatibilidad con tu código viejo que usaba `requireAuth`.
 * Así NO necesitas cambiar imports en tus rutas.
 */
export const requireAuth = auth;
