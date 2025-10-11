import { Request, Response } from 'express';
import { RegistroClienteService } from '../services/registro-cliente.service';

export const RegistroClienteController = {
  async crear(req: Request, res: Response) {
    try {
      const resultado = await RegistroClienteService.registrar(req.body);
      return res.status(201).json({
        ok: true,
        message: 'Registro de cliente exitoso.',
        ...resultado
      });
    } catch (error: any) {
      console.error('❌ Error en registro de cliente:', error);
      return res.status(400).json({
        ok: false,
        message: error.message || 'No se pudo registrar al cliente.'
      });
    }
  }
};
