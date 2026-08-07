import type { Challenge, GroupMember, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      // Populado pela JwtAuthGuard (via UsersService.syncFromClaims) em toda
      // rota autenticada; ausente apenas em rotas @Public().
      user?: User;
      // Populado pela GroupMemberGuard em rotas de grupo/challenge; ausente
      // se a rota não usa essa guard.
      groupMember?: GroupMember;
      // Populado pela ChallengeAccessGuard — evita IDOR (challenge de outro
      // grupo) e evita re-buscar o challenge no handler.
      challenge?: Challenge;
    }
  }
}

export {};
