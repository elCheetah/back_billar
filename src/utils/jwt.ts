import jwt, { SignOptions, JwtPayload, Secret } from 'jsonwebtoken';
import { ENV } from './env';
import { JwtPayloadUser } from '../types/auth';

const TWO_HOURS_SECONDS = 2 * 60 * 60;

export function signToken(
  payload: JwtPayloadUser,
  expires: string = ENV.JWT_EXPIRES
): { token: string; expiresIn: number } {
  const secret: Secret = ENV.JWT_SECRET;

  // 👇 Cast explícito para que TS acepte cadenas tipo "2h", "30m", etc.
  const signOptions: SignOptions = {
    expiresIn: expires as unknown as number, // <- esta línea evita conflicto de tipo
  };

  const token = jwt.sign(payload, secret, signOptions);

  // 🕒 Calcular segundos hasta la expiración
  const decoded = jwt.decode(token) as JwtPayload | null;
  const expiresIn = decoded?.exp
    ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
    : TWO_HOURS_SECONDS;

  return { token, expiresIn };
}

export function verifyToken(token: string): JwtPayloadUser {
  const secret: Secret = ENV.JWT_SECRET;
  const decoded = jwt.verify(token, secret) as JwtPayloadUser;
  return decoded;
}
