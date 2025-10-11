import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { ENV } from './env';

export function signResetToken(payload: { uid: number; rid: number }) {
  const token = jwt.sign(
    payload,
    ENV.RESET_JWT_SECRET as Secret,
    { expiresIn: ENV.RESET_JWT_EXPIRES } as SignOptions
  );
  return token;
}

export function verifyResetToken(token: string): { uid: number; rid: number } {
  return jwt.verify(token, ENV.RESET_JWT_SECRET as Secret) as any;
}
