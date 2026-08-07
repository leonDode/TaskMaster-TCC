import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { Hs256TokenVerifier } from './hs256-token-verifier';
import { JwksTokenVerifier } from './jwks-token-verifier';
import { TOKEN_VERIFIER } from './token-verifier.interface';

// JwtAuthGuard é registrada como APP_GUARD em app.module.ts (não aqui) —
// precisa ficar na mesma lista de providers que o ThrottlerBehindProxyGuard
// pra garantir que ela rode primeiro (ver comentário lá). TOKEN_VERIFIER
// exportado pra essa guard conseguir injetá-lo a partir de AppModule.
@Module({
  imports: [ConfigModule, UsersModule],
  providers: [
    {
      provide: TOKEN_VERIFIER,
      useFactory: (config: ConfigService) =>
        config.get<string>('SUPABASE_JWT_MODE', 'jwks') === 'hs256'
          ? new Hs256TokenVerifier(config)
          : new JwksTokenVerifier(config),
      inject: [ConfigService],
    },
  ],
  exports: [TOKEN_VERIFIER],
})
export class AuthModule {}
