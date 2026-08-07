import { UnauthorizedException } from '@nestjs/common';
import type {
  JwtClaims,
  TokenVerifier,
} from '../../src/auth/token-verifier.interface';

// Substitui JwksTokenVerifier/Hs256TokenVerifier nos testes e2e (via
// overrideProvider(TOKEN_VERIFIER)) — evita depender de um projeto Supabase
// real só para gerar tokens válidos. Exercita a guard/autorização de ponta
// a ponta sem tocar a parte de "o token é criptograficamente válido", que já
// é coberta pelos testes unitários da guard (jwt-auth.guard.spec.ts).
export class FakeTokenVerifier implements TokenVerifier {
  private readonly tokens = new Map<string, JwtClaims>();

  register(token: string, claims: JwtClaims): void {
    this.tokens.set(token, claims);
  }

  async verify(token: string): Promise<JwtClaims> {
    const claims = this.tokens.get(token);
    if (!claims) {
      throw new UnauthorizedException('Token de teste desconhecido');
    }
    return claims;
  }
}
