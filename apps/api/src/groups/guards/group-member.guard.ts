import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Confirma membership via a unique index [groupId, userId] (lookup O(1)) e
// anexa req.groupMember (com role) para RolesGuard/handlers consumirem.
// Não-membro -> 404 (não 403): não confirma a um estranho que o grupo
// existe. Aceita tanto :groupId (rotas aninhadas, ex: /groups/:groupId/
// challenges) quanto :id (rotas do próprio Group, ex: /groups/:id).
@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawGroupId = request.params.groupId ?? request.params.id;
    const groupId = Array.isArray(rawGroupId) ? rawGroupId[0] : rawGroupId;

    if (!groupId || !request.user) {
      throw new NotFoundException('Grupo não encontrado');
    }

    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: request.user.id } },
    });
    if (!groupMember) {
      throw new NotFoundException('Grupo não encontrado');
    }

    request.groupMember = groupMember;
    return true;
  }
}
