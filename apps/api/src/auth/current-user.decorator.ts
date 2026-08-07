import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';

// Só é chamado em rotas atrás da JwtAuthGuard (não @Public()), então
// request.user sempre deveria existir aqui — o throw é defesa em
// profundidade, não um caminho esperado.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
