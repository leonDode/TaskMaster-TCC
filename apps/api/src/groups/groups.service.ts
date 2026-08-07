import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Group, type GroupMember } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { generateInviteCode } from './invite-code';

export interface GroupMemberWithProfile {
  id: string;
  role: GroupMember['role'];
  joinedAt: Date;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

function isUniqueConstraintError(error: unknown, target?: string): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }
  if (!target) return true;
  const meta = error.meta?.target;
  return Array.isArray(meta) ? meta.includes(target) : meta === target;
}

const MAX_INVITE_CODE_ATTEMPTS = 5;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGroupDto): Promise<Group> {
    for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const group = await tx.group.create({
            data: {
              name: dto.name,
              description: dto.description,
              inviteCode: generateInviteCode(),
            },
          });
          await tx.groupMember.create({
            data: { groupId: group.id, userId, role: 'OWNER' },
          });
          return group;
        });
      } catch (error) {
        // Colisão de inviteCode é praticamente impossível (32^8 combinações)
        // mas tratamos mesmo assim em vez de deixar a request falhar.
        if (isUniqueConstraintError(error, 'invite_code')) {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException(
      'Não foi possível gerar um código de convite único — tente novamente',
    );
  }

  findAllForUser(userId: string): Promise<Group[]> {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // GroupMemberGuard já confirmou que o usuário é membro antes de chegar
  // aqui — a existência do Group é garantida por FK.
  findById(id: string): Promise<Group | null> {
    return this.prisma.group.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    return this.prisma.group.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.group.delete({ where: { id } });
  }

  async regenerateInviteCode(id: string): Promise<Group> {
    for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.group.update({
          where: { id },
          data: { inviteCode: generateInviteCode() },
        });
      } catch (error) {
        if (isUniqueConstraintError(error, 'invite_code')) {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException(
      'Não foi possível gerar um código de convite único — tente novamente',
    );
  }

  async join(userId: string, dto: JoinGroupDto): Promise<GroupMember> {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!group) {
      throw new NotFoundException('Código de convite inválido');
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) {
      throw new ConflictException('Você já é membro deste grupo');
    }

    return this.prisma.groupMember.create({
      data: { groupId: group.id, userId, role: 'MEMBER' },
    });
  }

  async listMembers(groupId: string): Promise<GroupMemberWithProfile[]> {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: { select: { displayName: true, avatarUrl: true } },
      },
    });
    return members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      userId: m.userId,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
    }));
  }

  async removeMember(groupId: string, memberId: string): Promise<void> {
    const member = await this.prisma.groupMember.findFirst({
      where: { id: memberId, groupId },
    });
    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }
    if (member.role === 'OWNER') {
      throw new BadRequestException(
        'O owner não pode remover a si mesmo — apague o grupo em vez disso',
      );
    }
    await this.prisma.groupMember.delete({ where: { id: memberId } });
  }

  async leave(groupId: string, userId: string): Promise<void> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Você não é membro deste grupo');
    }
    if (member.role === 'OWNER') {
      throw new ForbiddenException(
        'O owner não pode sair do grupo — apague o grupo em vez disso',
      );
    }
    await this.prisma.groupMember.delete({ where: { id: member.id } });
  }
}
