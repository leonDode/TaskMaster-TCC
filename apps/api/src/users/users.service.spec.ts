import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AvatarStorage } from '../storage/avatar-storage.interface';
import type { JwtClaims } from '../auth/token-verifier.interface';

type PrismaMock = {
  user: Record<string, jest.Mock>;
  category: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function createAvatarStorageMock(): jest.Mocked<AvatarStorage> {
  return {
    upload: jest.fn(),
    removeOtherExtensions: jest.fn(),
  };
}

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x00, 0x00]);

describe('UsersService', () => {
  let prisma: PrismaMock;
  let avatarStorage: jest.Mocked<AvatarStorage>;
  let service: UsersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    avatarStorage = createAvatarStorageMock();
    service = new UsersService(
      prisma as unknown as PrismaService,
      avatarStorage,
    );
  });

  describe('uploadAvatar', () => {
    it('rejeita quando nenhum arquivo é enviado', async () => {
      await expect(service.uploadAvatar('user-1', undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(avatarStorage.upload).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejeita arquivo inválido sem chamar storage nem prisma', async () => {
      const invalidFile = { buffer: Buffer.from('not-an-image'), size: 12 };

      await expect(service.uploadAvatar('user-1', invalidFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(avatarStorage.upload).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('faz upload e só então atualiza o Prisma com a URL pública + cache-busting', async () => {
      avatarStorage.upload.mockResolvedValue({
        publicUrl: 'https://supabase.example/avatars/user-1/avatar.jpg',
      });
      avatarStorage.removeOtherExtensions.mockResolvedValue(undefined);
      const updatedUser = { id: 'user-1', avatarUrl: 'whatever' };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.uploadAvatar('user-1', {
        buffer: JPEG_HEADER,
        size: JPEG_HEADER.length,
      });

      expect(avatarStorage.upload).toHaveBeenCalledWith({
        userId: 'user-1',
        ext: 'jpg',
        buffer: JPEG_HEADER,
        contentType: 'image/jpeg',
      });
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const [[updateArgs]] = prisma.user.update.mock.calls;
      expect(updateArgs.where).toEqual({ id: 'user-1' });
      expect(updateArgs.data.avatarUrl).toMatch(
        /^https:\/\/supabase\.example\/avatars\/user-1\/avatar\.jpg\?v=\d+$/,
      );
      expect(result).toBe(updatedUser);
    });

    it('nunca atualiza o prisma se o upload no storage falhar', async () => {
      avatarStorage.upload.mockRejectedValue(new Error('storage indisponível'));

      await expect(
        service.uploadAvatar('user-1', {
          buffer: JPEG_HEADER,
          size: JPEG_HEADER.length,
        }),
      ).rejects.toThrow('storage indisponível');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('dispara limpeza de outras extensões após sucesso, sem deixar a falha dela quebrar a resposta', async () => {
      avatarStorage.upload.mockResolvedValue({
        publicUrl: 'https://supabase.example/avatars/user-1/avatar.jpg',
      });
      avatarStorage.removeOtherExtensions.mockRejectedValue(
        new Error('cleanup falhou'),
      );
      prisma.user.update.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.uploadAvatar('user-1', {
          buffer: JPEG_HEADER,
          size: JPEG_HEADER.length,
        }),
      ).resolves.toEqual({ id: 'user-1' });
      expect(avatarStorage.removeOtherExtensions).toHaveBeenCalledWith(
        'user-1',
        'jpg',
      );
    });
  });

  describe('syncFromClaims', () => {
    const claims: JwtClaims = {
      sub: 'user-1',
      email: 'user@example.com',
      user_metadata: {
        full_name: 'User Name',
        avatar_url: 'https://oauth-provider.example/photo.jpg',
      },
    };

    it('usuário existente: não inclui avatarUrl no update (não sobrescreve upload manual)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.user.update.mockResolvedValue({ id: 'user-1' });

      await service.syncFromClaims(claims);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const [[updateArgs]] = prisma.user.update.mock.calls;
      expect(updateArgs.data).not.toHaveProperty('avatarUrl');
      expect(updateArgs.data).toEqual({
        email: claims.email,
        displayName: 'User Name',
      });
    });

    it('usuário novo: avatarUrl continua sendo setado na criação', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => unknown) =>
          fn({
            user: { create: jest.fn().mockResolvedValue({ id: 'user-1' }) },
            category: { createMany: jest.fn() },
          }),
      );

      await service.syncFromClaims(claims);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('fallback de corrida (P2002): não inclui avatarUrl no update', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const prismaError = Object.assign(new Error('unique constraint'), {
        code: 'P2002',
        clientVersion: 'test',
        name: 'PrismaClientKnownRequestError',
      });
      Object.setPrototypeOf(
        prismaError,
        (
          jest.requireActual('@prisma/client') as {
            Prisma: { PrismaClientKnownRequestError: { prototype: object } };
          }
        ).Prisma.PrismaClientKnownRequestError.prototype,
      );
      prisma.$transaction.mockRejectedValue(prismaError);
      prisma.user.update.mockResolvedValue({ id: 'user-1' });

      await service.syncFromClaims(claims);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const [[updateArgs]] = prisma.user.update.mock.calls;
      expect(updateArgs.data).not.toHaveProperty('avatarUrl');
      expect(updateArgs.data).toEqual({
        email: claims.email,
        displayName: 'User Name',
      });
    });
  });
});
