import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { TokenVerifier } from './token-verifier.interface';
import type { UsersService } from '../users/users.service';

function createContext(opts: {
  authorization?: string;
  isPublic?: boolean;
}): ExecutionContext {
  const request = {
    headers: { authorization: opts.authorization },
    user: undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let verifier: jest.Mocked<TokenVerifier>;
  let usersService: jest.Mocked<UsersService>;
  let reflector: Reflector;
  let guard: JwtAuthGuard;
  const fakeUser = { id: 'user-1' } as User;

  beforeEach(() => {
    verifier = { verify: jest.fn() };
    usersService = {
      syncFromClaims: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector, verifier, usersService);
  });

  it('permite acesso a rotas @Public() sem checar token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createContext({ isPublic: true });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejeita quando o header Authorization está ausente', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejeita quando o header Authorization não é Bearer', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('propaga a rejeição do TokenVerifier (token inválido/expirado)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    verifier.verify.mockRejectedValue(
      new UnauthorizedException('Token inválido ou expirado'),
    );
    const context = createContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usersService.syncFromClaims).not.toHaveBeenCalled();
  });

  it('em token válido, provisiona o usuário via JIT e popula request.user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    verifier.verify.mockResolvedValue({ sub: 'user-1', email: 'a@b.com' });
    usersService.syncFromClaims.mockResolvedValue(fakeUser);
    const context = createContext({ authorization: 'Bearer good-token' });
    const request = context.switchToHttp().getRequest();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(usersService.syncFromClaims).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'a@b.com',
    });
    expect(request.user).toBe(fakeUser);
  });
});
