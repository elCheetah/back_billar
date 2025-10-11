import { Request, Response } from 'express';
import { RegistroPropietarioService } from '../services/registro-propietario.service';

export const RegistroPropietarioController = {
  async crear(req: Request, res: Response) {
    try {
      const resultado = await RegistroPropietarioService.registrar(req.body);

      return res.status(201).json({
        ok: true,
        message: 'Registro de propietario completado con éxito.',
        ...resultado
      });
    } catch (error: any) {
      console.error('❌ Error en registro de propietario:', error);
      return res.status(400).json({
        ok: false,
        message: error.message || 'No se pudo completar el registro del propietario.'
      });
    }
  }
};
