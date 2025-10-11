import { Request, Response, NextFunction } from 'express';

type Rol = 'CLIENTE' | 'PROPIETARIO' | 'ADMINISTRADOR';

export function requireRol(...rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { rol?: Rol };
    if (!user?.rol || !rolesPermitidos.includes(user.rol)) {
      return res.status(403).json({ ok: false, message: 'Prohibido: no tienes permisos para esta operación.' });
    }
    next();
  };
}
