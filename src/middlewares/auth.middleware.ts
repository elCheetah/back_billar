import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    correo: string;
    rol: 'USUARIO' | 'ADMINISTRADOR';
    nombreCompleto: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Falta token Bearer en Authorization' });
  }
  const token = auth.substring(7).trim();
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

