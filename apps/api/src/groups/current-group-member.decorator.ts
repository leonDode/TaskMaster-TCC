import {
  createParamDecorator,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { GroupMember } from '@prisma/client';

// Só é chamado em rotas atrás da GroupMemberGuard — request.groupMember
// sempre deveria existir aqui; o throw é defesa em profundidade.
export const CurrentGroupMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GroupMember => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.groupMember) {
      throw new NotFoundException();
    }
    return request.groupMember;
  },
);
