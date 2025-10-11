// src/controllers/password-recovery.controller.ts
import { Request, Response } from 'express';
import { PasswordRecoveryService } from '../services/password-recovery.service';

export const PasswordRecoveryController = {
  async enviarCodigo(req: Request, res: Response) {
    try {
      const { correo } = req.body;
      const out = await PasswordRecoveryService.enviarCodigo(correo);
      return res.json({ ok: true, ...out });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || 'No se pudo enviar el código.' });
    }
  },

  async verificarCodigo(req: Request, res: Response) {
    try {
      const { correo, codigo } = req.body;
      const out = await PasswordRecoveryService.verificarCodigo(correo, codigo);
      return res.json({ ok: true, ...out });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || 'Código inválido.' });
    }
  },

  async cambiarPassword(req: Request, res: Response) {
    try {
      const { correo, codigo, password } = req.body;
      const resetToken = String(req.headers['x-reset-token'] || req.body.resetToken || '');
      if (!resetToken) {
        return res.status(401).json({ ok: false, message: 'Falta token de verificación (x-reset-token).' });
      }
      const out = await PasswordRecoveryService.cambiarPassword({ correo, codigo, password, resetToken });
      return res.json({ ok: true, ...out });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || 'No se pudo actualizar la contraseña.' });
    }
  }
};
