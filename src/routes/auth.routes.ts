import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

/**
 * @route POST /auth/login
 * @body  { correo: string, password: string }
 * @returns { token, expiresIn, user:{ id, correo, nombreCompleto, rol } }
 */
router.post(
  '/login',
  [
    body('correo').isString().trim().isEmail().withMessage('Correo inválido'),
    body('password').isString().trim().isLength({ min: 6 }).withMessage('Password inválido'),
  ],
  validateRequest,
  AuthController.login
);

export default router;
