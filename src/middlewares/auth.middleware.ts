import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ ok: false, message: 'No autorizado: token faltante o inválido.' });
    }
    const payload = verifyToken(token);

    // req.user se tipa en src/types/express.d.ts
    (req as any).user = {
      id: Number(payload.id),
      correo: String(payload.correo),
      rol: String(payload.rol),
      nombreCompleto: (payload as any).nombreCompleto || ''
    };
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: 'No autorizado: token inválido o expirado.' });
  }
}

// alias si quieres importar como `auth`
export const auth = requireAuth;
