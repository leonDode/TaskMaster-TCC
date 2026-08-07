import {
  createParamDecorator,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Challenge } from '@prisma/client';

// Só é chamado em rotas atrás da ChallengeAccessGuard — request.challenge
// sempre deveria existir aqui; o throw é defesa em profundidade.
export const CurrentChallenge = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Challenge => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.challenge) {
      throw new NotFoundException();
    }
    return request.challenge;
  },
);
