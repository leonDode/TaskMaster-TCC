import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import type { PrismaService } from '../prisma/prisma.service';

type PrismaMock = {
  group: Record<string, jest.Mock>;
  groupMember: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  return {
    group: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    groupMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('GroupsService', () => {
  let prisma: PrismaMock;
  let service: GroupsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new GroupsService(prisma as unknown as PrismaService);
  });

  describe('join', () => {
    it('404 se o código de convite não existe', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      await expect(
        service.join('user-1', { inviteCode: 'ABCDEFGH' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('409 se o usuário já é membro do grupo', async () => {
      prisma.group.findUnique.mockResolvedValue({ id: 'group-1' });
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'member-1' });
      await expect(
        service.join('user-1', { inviteCode: 'ABCDEFGH' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.groupMember.create).not.toHaveBeenCalled();
    });

    it('cria o membro com role MEMBER quando tudo é válido', async () => {
      prisma.group.findUnique.mockResolvedValue({ id: 'group-1' });
      prisma.groupMember.findUnique.mockResolvedValue(null);
      prisma.groupMember.create.mockResolvedValue({ id: 'member-1' });

      await service.join('user-1', { inviteCode: 'ABCDEFGH' });

      expect(prisma.groupMember.create).toHaveBeenCalledWith({
        data: { groupId: 'group-1', userId: 'user-1', role: 'MEMBER' },
      });
    });
  });

  describe('leave', () => {
    it('404 se o usuário não é membro', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);
      await expect(service.leave('group-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('403 se o OWNER tentar sair (precisa apagar o grupo em vez disso)', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'OWNER',
      });
      await expect(service.leave('group-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.groupMember.delete).not.toHaveBeenCalled();
    });

    it('MEMBER consegue sair normalmente', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'MEMBER',
      });
      await service.leave('group-1', 'user-1');
      expect(prisma.groupMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
    });
  });

  describe('removeMember', () => {
    it('404 se o membro não existe no grupo', async () => {
      prisma.groupMember.findFirst.mockResolvedValue(null);
      await expect(service.removeMember('group-1', 'member-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('400 se tentar remover o próprio OWNER', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: 'OWNER',
      });
      await expect(service.removeMember('group-1', 'member-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.groupMember.delete).not.toHaveBeenCalled();
    });

    it('remove normalmente um MEMBER comum', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({
        id: 'member-2',
        role: 'MEMBER',
      });
      await service.removeMember('group-1', 'member-2');
      expect(prisma.groupMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-2' },
      });
    });
  });
});
