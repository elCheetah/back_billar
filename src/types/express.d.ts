import 'express';

declare global {
  namespace Express {
    interface UserToken {
      id: number;
      correo: string;
      rol: 'CLIENTE' | 'PROPIETARIO' | 'ADMINISTRADOR';
      nombreCompleto?: string;
    }
    interface Request {
      user?: UserToken;
    }
  }
}

export {};
