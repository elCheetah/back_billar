import { Request, Response, NextFunction } from 'express';

export function requireRol(...rolesPermitidos: Array<'CLIENTE' | 'PROPIETARIO' | 'ADMINISTRADOR'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rol = req.user?.rol;
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado para tu rol actual.' });
    }
    next();
  };
}
