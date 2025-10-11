import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export const AuthController = {
  // POST /auth/login
  async login(req: Request, res: Response) {
    try {
      const { correo, password } = req.body as { correo: string; password: string };
      const result = await AuthService.login({ correo, password });

      // No guardamos nada en servidor (serverless-friendly). El cliente persiste el token.
      return res.status(200).json({
        ok: true,
        ...result,
      });
    } catch (err: any) {
      const message =
        err?.message === 'Usuario inactivo' || err?.message === 'Credenciales inválidas'
          ? err.message
          : 'Error al iniciar sesión';
      const code = message === 'Credenciales inválidas' ? 401 : 400;
      return res.status(code).json({ ok: false, message });
    }
  },
};
