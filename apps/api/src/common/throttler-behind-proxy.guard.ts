import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rastreia por usuário autenticado (req.user.id, populado pela JwtAuthGuard
// — que roda antes desta guard na ordem de APP_GUARD, ver app.module.ts)
// e cai para IP em rotas públicas/não autenticadas. Sem isso, usuários atrás
// do mesmo NAT/proxy corporativo compartilhariam o mesmo balde de rate
// limit por IP.
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ?? req.ip;
  }
}
