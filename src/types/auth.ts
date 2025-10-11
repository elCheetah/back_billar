export interface JwtPayloadUser {
  id: number;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
  nombreCompleto: string;
}

export interface LoginRequestDTO {
  correo: string;
  password: string;
}

export interface LoginResponseDTO {
  token: string;
  expiresIn: number; // segundos
  user: {
    id: number;
    correo: string;
    nombreCompleto: string;
    rol: 'USUARIO' | 'ADMINISTRADOR';
  };
}
