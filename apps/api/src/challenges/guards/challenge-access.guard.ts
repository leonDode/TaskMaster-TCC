import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

function paramAsString(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Roda depois de GroupMemberGuard. Confirma que o :id (challenge) pertence
// ao :groupId da rota — sem isso, um membro de dois grupos poderia passar o
// id de um challenge do grupo B numa rota do grupo A (IDOR). 404 (não 403):
// não revela se o challenge existe em outro grupo.
@Injectable()
export class ChallengeAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const groupId = paramAsString(request.params.groupId);
    const challengeId = paramAsString(request.params.id);

    if (!groupId || !challengeId) {
      throw new NotFoundException('Desafio não encontrado');
    }

    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, groupId },
    });
    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado');
    }

    request.challenge = challenge;
    return true;
  }
}
