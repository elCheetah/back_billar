import 'express';

declare global {
  namespace Express {
    interface UserPayload {
      id: number;
      correo: string;
      rol: 'CLIENTE' | 'PROPIETARIO' | 'ADMINISTRADOR';
      nombreCompleto: string;
    }
    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
