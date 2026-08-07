import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { JwtClaims, TokenVerifier } from './token-verifier.interface';

// Modo recomendado: projetos Supabase com "JWT Signing Keys" (RS256/ES256)
// expõem um endpoint JWKS público. `createRemoteJWKSet` cacheia as chaves
// (cooldown evita bater no endpoint mais de 1x/30s mesmo com `kid`
// desconhecido) — se o endpoint cair, chaves já cacheadas continuam válidas
// até expirar; se cair e o cache expirar, a verificação falha (fail-closed).
@Injectable()
export class JwksTokenVerifier implements TokenVerifier {
  private readonly logger = new Logger(JwksTokenVerifier.name);
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: ConfigService) {
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
    const jwksUrl =
      config.get<string>('SUPABASE_JWKS_URL') ||
      `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    this.issuer =
      config.get<string>('SUPABASE_JWT_ISSUER') || `${supabaseUrl}/auth/v1`;
    this.audience = config.get<string>(
      'SUPABASE_JWT_AUDIENCE',
      'authenticated',
    );

    this.jwks = createRemoteJWKSet(new URL(jwksUrl), {
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60 * 1000,
    });
  }

  async verify(token: string): Promise<JwtClaims> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: 5,
      });
      return payload as JwtClaims;
    } catch (error) {
      this.logger.debug(`JWT (JWKS) inválido: ${(error as Error).message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
