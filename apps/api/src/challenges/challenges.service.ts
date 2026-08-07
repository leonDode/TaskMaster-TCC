import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Challenge,
  type ChallengeTask,
  type TaskKind,
  type UnitType,
} from '@prisma/client';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  reachedTarget,
  validateQuantitativeShape,
} from '../common/quantitative';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { IncrementProgressDto } from './dto/increment-progress.dto';
import { CreateChallengeTaskDto } from './dto/create-challenge-task.dto';
import { ChallengeStatusFilter } from './dto/find-challenges-query.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { UpdateChallengeTaskDto } from './dto/update-challenge-task.dto';

export interface ChallengeTaskProgress {
  challengeTaskId: string;
  title: string;
  points: number;
  completedToday: boolean;
  totalCompletions: number;
  kind: TaskKind;
  // Decimal serializa como string no JSON; null em tasks BOOLEAN.
  targetValue: Prisma.Decimal | null;
  unit: UnitType | null;
  valueToday: Prisma.Decimal | null;
}

export interface ChallengeProgressResult {
  challengeTaskId: string;
  progressOn: string;
  currentValue: Prisma.Decimal;
  targetValue: Prisma.Decimal;
  completed: boolean;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

// Dia calendário UTC (decisão já tomada, não reaberta — ver plano):
// justiça entre membros em fusos diferentes num placar competitivo
// compartilhado. Assimetria intencional com o dia local usado por Tasks.
function todayUtcDate(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  async create(
    groupId: string,
    createdByMemberId: string,
    dto: CreateChallengeDto,
  ): Promise<Challenge> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) {
      throw new BadRequestException('endAt deve ser depois de startAt');
    }
    dto.tasks.forEach((task) => validateQuantitativeShape(task));

    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.challenge.create({
        data: {
          groupId,
          title: dto.title,
          description: dto.description,
          startAt,
          endAt,
          createdByMemberId,
        },
      });
      await tx.challengeTask.createMany({
        data: dto.tasks.map((task) => ({
          challengeId: challenge.id,
          title: task.title,
          description: task.description,
          points: task.points ?? 1,
          kind: task.kind,
          targetValue: task.targetValue,
          unit: task.unit,
        })),
      });
      return challenge;
    });
  }

  findAllForGroup(
    groupId: string,
    status?: ChallengeStatusFilter,
  ): Promise<Challenge[]> {
    const now = new Date();
    const where: Prisma.ChallengeWhereInput = { groupId };
    if (status === 'active') {
      where.startAt = { lte: now };
      where.endAt = { gte: now };
    } else if (status === 'upcoming') {
      where.startAt = { gt: now };
    } else if (status === 'past') {
      where.endAt = { lt: now };
    }
    return this.prisma.challenge.findMany({
      where,
      orderBy: { startAt: 'desc' },
    });
  }

  findWithTasks(challengeId: string) {
    return this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { tasks: true },
    });
  }

  async update(
    challenge: Challenge,
    dto: UpdateChallengeDto,
  ): Promise<Challenge> {
    const changingWindow = dto.startAt !== undefined || dto.endAt !== undefined;
    if (changingWindow) {
      const hasCompletions = await this.prisma.challengeCompletion.findFirst({
        where: { challengeId: challenge.id },
      });
      if (hasCompletions) {
        throw new BadRequestException(
          'Não é possível alterar startAt/endAt depois que há conclusões registradas',
        );
      }
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : challenge.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : challenge.endAt;
    if (endAt <= startAt) {
      throw new BadRequestException('endAt deve ser depois de startAt');
    }

    return this.prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        title: dto.title,
        description: dto.description,
        startAt: dto.startAt ? startAt : undefined,
        endAt: dto.endAt ? endAt : undefined,
      },
    });
  }

  async remove(challengeId: string): Promise<void> {
    await this.prisma.challenge.delete({ where: { id: challengeId } });
  }

  addTask(
    challengeId: string,
    dto: CreateChallengeTaskDto,
  ): Promise<ChallengeTask> {
    validateQuantitativeShape(dto);
    return this.prisma.challengeTask.create({
      data: {
        challengeId,
        title: dto.title,
        description: dto.description,
        points: dto.points ?? 1,
        kind: dto.kind,
        targetValue: dto.targetValue,
        unit: dto.unit,
      },
    });
  }

  // 404 (não 403) se a tarefa existe mas é de outro desafio — mesmo padrão
  // usado em toda a API; evita IDOR entre desafios.
  private async findTaskOrThrow(
    challengeId: string,
    taskId: string,
  ): Promise<ChallengeTask> {
    const task = await this.prisma.challengeTask.findFirst({
      where: { id: taskId, challengeId },
    });
    if (!task) {
      throw new NotFoundException('Tarefa do desafio não encontrada');
    }
    return task;
  }

  async updateTask(
    challengeId: string,
    taskId: string,
    dto: UpdateChallengeTaskDto,
  ): Promise<ChallengeTask> {
    const task = await this.findTaskOrThrow(challengeId, taskId);

    // Mesma regra do lado pessoal: alvo/unidade travam assim que existe
    // progresso, em vez de recalcular conclusões retroativamente.
    if (dto.targetValue !== undefined || dto.unit !== undefined) {
      if (task.kind !== 'QUANTITATIVE') {
        throw new BadRequestException('Task booleana não tem targetValue/unit');
      }
      const hasProgress = await this.prisma.challengeProgress.findFirst({
        where: { challengeTaskId: taskId },
      });
      if (hasProgress) {
        throw new BadRequestException(
          'Não é possível alterar targetValue/unit depois que há progresso registrado',
        );
      }
    }

    return this.prisma.challengeTask.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        points: dto.points,
        targetValue: dto.targetValue,
        unit: dto.unit,
      },
    });
  }

  async removeTask(challengeId: string, taskId: string): Promise<void> {
    await this.findTaskOrThrow(challengeId, taskId);
    await this.prisma.challengeTask.delete({ where: { id: taskId } });
  }

  async complete(
    challenge: Challenge,
    taskId: string,
    groupMemberId: string,
  ): Promise<void> {
    const task = await this.findTaskOrThrow(challenge.id, taskId);
    if (task.kind === 'QUANTITATIVE') {
      throw new BadRequestException(
        'Task quantitativa: use POST /groups/:groupId/challenges/:id/tasks/:taskId/progress',
      );
    }

    const now = new Date();
    if (now < challenge.startAt || now > challenge.endAt) {
      throw new BadRequestException('Fora da janela do desafio');
    }

    try {
      await this.prisma.challengeCompletion.create({
        data: {
          challengeId: challenge.id,
          challengeTaskId: taskId,
          groupMemberId,
          completedOn: todayUtcDate(),
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Já concluída hoje');
      }
      throw error;
    }
    // Invalidação ativa: a própria ação do usuário fica instantânea para
    // ele; o TTL de 90s só limita a demora para os outros verem.
    await this.leaderboardService.invalidate(challenge.id);
  }

  // Desfaz só a conclusão do dia atual — histórico passado é imutável, para
  // não corromper o leaderboard já consolidado.
  async uncomplete(
    challenge: Challenge,
    taskId: string,
    groupMemberId: string,
  ): Promise<void> {
    const task = await this.findTaskOrThrow(challenge.id, taskId);
    if (task.kind === 'QUANTITATIVE') {
      throw new BadRequestException(
        'Task quantitativa: progresso de desafio é imutável e não pode ser desfeito',
      );
    }

    // Mesma janela de `complete`: se não dá para concluir fora do período,
    // também não pode dar para desfazer. Sem isso, um desafio encerrado hoje
    // mais cedo ainda aceitaria remover a conclusão do dia — mexendo no
    // placar final de um desafio já fechado.
    const now = new Date();
    if (now < challenge.startAt || now > challenge.endAt) {
      throw new BadRequestException('Fora da janela do desafio');
    }

    await this.prisma.challengeCompletion.deleteMany({
      where: {
        challengeId: challenge.id,
        challengeTaskId: taskId,
        groupMemberId,
        completedOn: todayUtcDate(),
      },
    });
    await this.leaderboardService.invalidate(challenge.id);
  }

  // --- Progresso (ChallengeTask QUANTITATIVE) ---

  // Só incrementa, nunca define nem decrementa: o leaderboard agrega esta
  // tabela, e poder desfazer o que já foi contabilizado permitiria manipular
  // ranking. A garantia vem do IncrementProgressDto (delta > 0 obrigatório,
  // `value` rejeitado pelo forbidNonWhitelisted do pipe global), não de um
  // `if` aqui.
  //
  // `progressOn` é derivado no servidor e a rota não aceita data — não existe
  // superfície para escrever numa ocorrência passada. Dia UTC, não o fuso do
  // usuário: a janela de escrita precisa ser idêntica para todos os membros
  // por justiça competitiva (ver todayUtcDate e o README).
  async upsertProgress(
    challenge: Challenge,
    taskId: string,
    groupMemberId: string,
    dto: IncrementProgressDto,
  ): Promise<ChallengeProgressResult> {
    const task = await this.findTaskOrThrow(challenge.id, taskId);
    if (task.kind !== 'QUANTITATIVE') {
      throw new BadRequestException(
        'Task booleana: use POST /groups/:groupId/challenges/:id/tasks/:taskId/complete',
      );
    }

    const now = new Date();
    if (now < challenge.startAt || now > challenge.endAt) {
      throw new BadRequestException('Fora da janela do desafio');
    }

    const progressOn = todayUtcDate();
    const target = task.targetValue!;

    const currentValue = await this.prisma.$transaction(async (tx) => {
      // Sem teto no alvo, de propósito: o ranking é por SUM(value), então
      // limitar empataria todo mundo que bate a meta e descartaria o
      // excedente que decide "quem bebeu mais". `targetValue` aqui só marca
      // quando a completion nasce.
      const { value } = await tx.challengeProgress.upsert({
        where: {
          challengeTaskId_groupMemberId_progressOn: {
            challengeTaskId: taskId,
            groupMemberId,
            progressOn,
          },
        },
        create: {
          challengeId: challenge.id,
          challengeTaskId: taskId,
          groupMemberId,
          progressOn,
          value: dto.delta,
        },
        // increment no banco, não read-modify-write: dois toques simultâneos
        // no "+1" não podem perder um do outro.
        update: { value: { increment: dto.delta } },
      });

      // Sem ramo `else`: com delta > 0 e sem teto o valor é monotônico, então
      // uma vez batido o alvo nunca se volta atrás. É essa ausência que
      // garante estruturalmente que uma conclusão de desafio jamais some do
      // placar.
      if (reachedTarget(value, target)) {
        await tx.challengeCompletion.upsert({
          where: {
            challengeTaskId_groupMemberId_completedOn: {
              challengeTaskId: taskId,
              groupMemberId,
              completedOn: progressOn,
            },
          },
          create: {
            challengeId: challenge.id,
            challengeTaskId: taskId,
            groupMemberId,
            completedOn: progressOn,
          },
          update: {},
        });
      }

      return value;
    });

    await this.leaderboardService.invalidate(challenge.id);

    return {
      challengeTaskId: taskId,
      progressOn: progressOn.toISOString().slice(0, 10),
      currentValue,
      targetValue: target,
      completed: reachedTarget(currentValue, target),
    };
  }

  async myProgress(
    challengeId: string,
    groupMemberId: string,
  ): Promise<ChallengeTaskProgress[]> {
    const today = todayUtcDate();
    const [tasks, completions, progressRows] = await Promise.all([
      this.prisma.challengeTask.findMany({ where: { challengeId } }),
      this.prisma.challengeCompletion.findMany({
        where: { challengeId, groupMemberId },
      }),
      this.prisma.challengeProgress.findMany({
        where: {
          challengeTask: { challengeId },
          groupMemberId,
          progressOn: today,
        },
      }),
    ]);

    const todayMs = today.getTime();
    const valueByTaskId = new Map(
      progressRows.map((p) => [p.challengeTaskId, p.value]),
    );

    return tasks.map((task) => {
      const taskCompletions = completions.filter(
        (c) => c.challengeTaskId === task.id,
      );
      return {
        challengeTaskId: task.id,
        title: task.title,
        points: task.points,
        completedToday: taskCompletions.some(
          (c) => c.completedOn.getTime() === todayMs,
        ),
        totalCompletions: taskCompletions.length,
        kind: task.kind,
        targetValue: task.targetValue,
        unit: task.unit,
        // Sem incremento hoje ainda não há linha — reporta 0, não null.
        valueToday:
          task.kind === 'QUANTITATIVE'
            ? (valueByTaskId.get(task.id) ?? new Prisma.Decimal(0))
            : null,
      };
    });
  }
}
