import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { GroupRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

// Roda depois de GroupMemberGuard (mesma ordem em @UseGuards). Já sabemos
// que o usuário é membro (senão a request nem chegaria aqui) — então 403
// aqui é seguro: revela só que a ação existe, não a existência do grupo.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<GroupRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const role = request.groupMember?.role;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException(
        'Você não tem permissão para executar esta ação',
      );
    }
    return true;
  }
}
