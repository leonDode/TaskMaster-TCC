import { SetMetadata } from '@nestjs/common';
import type { GroupRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Exige que GroupMemberGuard já tenha rodado (precisa de req.groupMember).
export const Roles = (...roles: GroupRole[]) => SetMetadata(ROLES_KEY, roles);
