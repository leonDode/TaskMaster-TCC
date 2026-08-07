export interface JwtClaims {
  sub: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  [key: string]: unknown;
}

// Único ponto de contato entre a guard e "como o token é validado".
// Trocar de JWKS <-> HS256 é só trocar a implementação injetada em
// TOKEN_VERIFIER (ver auth.module.ts) via SUPABASE_JWT_MODE — a guard e os
// testes de autorização não mudam.
export interface TokenVerifier {
  // Deve lançar UnauthorizedException em qualquer falha (ausente, expirado,
  // assinatura inválida, iss/aud incorretos) — nunca retornar claims parciais.
  verify(token: string): Promise<JwtClaims>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
