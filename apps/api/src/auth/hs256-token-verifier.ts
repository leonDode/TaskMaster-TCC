import { createSecretKey, type KeyObject } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { JwtClaims, TokenVerifier } from './token-verifier.interface';

// Modo legado: projetos Supabase antigos assinam com um HS256 JWT secret
// compartilhado (Project Settings -> API -> JWT Settings -> "Legacy JWT
// Secret"). Só deve ser usado se `curl .../.well-known/jwks.json` não
// retornar chaves (ver Riscos no plano) — SUPABASE_JWT_MODE=hs256 seleciona
// esta implementação.
@Injectable()
export class Hs256TokenVerifier implements TokenVerifier {
  private readonly logger = new Logger(Hs256TokenVerifier.name);
  private readonly secret: KeyObject;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: ConfigService) {
    const jwtSecret = config.getOrThrow<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
    this.issuer =
      config.get<string>('SUPABASE_JWT_ISSUER') || `${supabaseUrl}/auth/v1`;
    this.audience = config.get<string>(
      'SUPABASE_JWT_AUDIENCE',
      'authenticated',
    );
    this.secret = createSecretKey(Buffer.from(jwtSecret, 'utf-8'));
  }

  async verify(token: string): Promise<JwtClaims> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: 5,
      });
      return payload as JwtClaims;
    } catch (error) {
      this.logger.debug(`JWT (HS256) inválido: ${(error as Error).message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
