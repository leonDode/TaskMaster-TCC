import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Task,
  type TaskKind,
  type UnitType,
} from '@prisma/client';
import type { RecurrenceRule } from '@task-master/shared';
import { expandOccurrences } from '@task-master/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  clampToTarget,
  reachedTarget,
  validateQuantitativeShape,
} from '../common/quantitative';
import { CreateTaskDto } from './dto/create-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import { GetOccurrencesQueryDto } from './dto/get-occurrences-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpsertProgressDto } from './dto/upsert-progress.dto';

export interface TaskOccurrence {
  taskId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  occurrenceDate: string;
  completed: boolean;
  kind: TaskKind;
  // Decimal serializa como string no JSON (ex. "2.00"); null em tasks BOOLEAN.
  targetValue: Prisma.Decimal | null;
  unit: UnitType | null;
  currentValue: Prisma.Decimal | null;
}

export interface TaskProgressResult {
  taskId: string;
  occurrenceDate: string;
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

// Postgres DATE vira Date às 00:00:00 UTC no Prisma — toISOString() sempre
// renderiza em UTC, então isto é seguro independente do fuso da máquina que
// roda o processo (mesma garantia de expandOccurrences).
function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toRecurrenceRule(task: Task): RecurrenceRule {
  const startDate = formatDateOnly(task.recurrenceStartDate!);
  const endDate = task.recurrenceEndDate
    ? formatDateOnly(task.recurrenceEndDate)
    : null;

  switch (task.recurrenceFrequency) {
    case 'DAILY':
      return { frequency: 'DAILY', startDate, endDate };
    case 'WEEKLY':
      return {
        frequency: 'WEEKLY',
        daysOfWeek: task.recurrenceDaysOfWeek,
        startDate,
        endDate,
      };
    case 'MONTHLY':
      return {
        frequency: 'MONTHLY',
        dayOfMonth: task.recurrenceDayOfMonth!,
        startDate,
        endDate,
      };
    case 'YEARLY':
      return {
        frequency: 'YEARLY',
        month: task.recurrenceMonth!,
        dayOfMonth: task.recurrenceDayOfMonth!,
        startDate,
        endDate,
      };
    default:
      throw new Error('Task não é recorrente');
  }
}

// occurrenceDate canônica de uma task avulsa: o próprio dueDate se houver,
// senão a data (UTC) de criação — fallback determinístico e imutável, nunca
// re-derivado de campos que podem mudar depois (ver plano, "caveat aceito
// conscientemente" sobre editar dueDate pós-conclusão).
function oneOffOccurrenceDate(task: Task): string {
  return task.dueDate
    ? formatDateOnly(task.dueDate)
    : formatDateOnly(task.createdAt);
}

// Só tasks QUANTITATIVE têm targetValue (garantido por
// validateQuantitativeShape na criação), então o `!` aqui é seguro.
function targetOf(task: Task): Prisma.Decimal {
  return task.targetValue!;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private validateCreateShape(dto: CreateTaskDto): void {
    validateQuantitativeShape(dto);

    if (!dto.recurrenceFrequency) {
      const strayFields = [
        dto.recurrenceDaysOfWeek,
        dto.recurrenceDayOfMonth,
        dto.recurrenceMonth,
        dto.recurrenceStartDate,
        dto.recurrenceEndDate,
      ];
      if (strayFields.some((f) => f !== undefined)) {
        throw new BadRequestException(
          'Campos de recorrência exigem recurrenceFrequency',
        );
      }
      return;
    }

    if (dto.dueDate !== undefined) {
      throw new BadRequestException(
        'dueDate não é permitido em tasks recorrentes',
      );
    }
    if (!dto.recurrenceStartDate) {
      throw new BadRequestException(
        'recurrenceStartDate é obrigatório em tasks recorrentes',
      );
    }
    if (
      dto.recurrenceFrequency === 'WEEKLY' &&
      !dto.recurrenceDaysOfWeek?.length
    ) {
      throw new BadRequestException(
        'recurrenceDaysOfWeek é obrigatório para frequência WEEKLY',
      );
    }
    if (
      (dto.recurrenceFrequency === 'MONTHLY' ||
        dto.recurrenceFrequency === 'YEARLY') &&
      dto.recurrenceDayOfMonth == null
    ) {
      throw new BadRequestException(
        'recurrenceDayOfMonth é obrigatório para frequências MONTHLY/YEARLY',
      );
    }
    if (dto.recurrenceFrequency === 'YEARLY' && dto.recurrenceMonth == null) {
      throw new BadRequestException(
        'recurrenceMonth é obrigatório para frequência YEARLY',
      );
    }
  }

  // Async porque a regra de targetValue/unit depende de já existir progresso
  // registrado — mesmo precedente de startAt/endAt em ChallengesService.update:
  // em vez de recalcular conclusões retroativamente, trava a edição.
  private async validateUpdateShape(
    task: Task,
    dto: UpdateTaskDto,
  ): Promise<void> {
    const touchesQuantitative =
      dto.targetValue !== undefined || dto.unit !== undefined;

    if (touchesQuantitative) {
      if (task.kind !== 'QUANTITATIVE') {
        throw new BadRequestException('Task booleana não tem targetValue/unit');
      }
      const hasProgress = await this.prisma.taskProgress.findFirst({
        where: { taskId: task.id },
      });
      if (hasProgress) {
        throw new BadRequestException(
          'Não é possível alterar targetValue/unit depois que há progresso registrado',
        );
      }
    }

    const isRecurring = task.recurrenceFrequency != null;

    if (isRecurring && dto.dueDate !== undefined) {
      throw new BadRequestException('Task recorrente não tem dueDate');
    }
    if (!isRecurring) {
      const recurrenceFields = [
        dto.recurrenceDaysOfWeek,
        dto.recurrenceDayOfMonth,
        dto.recurrenceMonth,
        dto.recurrenceStartDate,
        dto.recurrenceEndDate,
      ];
      if (recurrenceFields.some((f) => f !== undefined)) {
        throw new BadRequestException(
          'Task avulsa não aceita campos de recorrência',
        );
      }
    }
  }

  private async assertCategoryOwnership(
    userId: string,
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (!categoryId) return;
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
  }

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    this.validateCreateShape(dto);
    await this.assertCategoryOwnership(userId, dto.categoryId);

    return this.prisma.task.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        kind: dto.kind,
        targetValue: dto.targetValue,
        unit: dto.unit,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        recurrenceFrequency: dto.recurrenceFrequency,
        recurrenceDaysOfWeek: dto.recurrenceDaysOfWeek ?? [],
        recurrenceDayOfMonth: dto.recurrenceDayOfMonth,
        recurrenceMonth: dto.recurrenceMonth,
        recurrenceStartDate: dto.recurrenceStartDate
          ? new Date(dto.recurrenceStartDate)
          : undefined,
        recurrenceEndDate: dto.recurrenceEndDate
          ? new Date(dto.recurrenceEndDate)
          : undefined,
      },
    });
  }

  async findAll(userId: string, query: FindTasksQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.TaskWhereInput = {
      userId,
      categoryId: query.categoryId,
      recurrenceFrequency:
        query.recurring === undefined
          ? undefined
          : query.recurring
            ? { not: null }
            : null,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // 404 (não 403) se a task existe mas é de outro usuário — mesmo padrão
  // usado em toda a API.
  async findOwnedOrThrow(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) {
      throw new NotFoundException('Task não encontrada');
    }
    return task;
  }

  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOwnedOrThrow(userId, id);
    await this.validateUpdateShape(task, dto);
    if (dto.categoryId !== undefined) {
      await this.assertCategoryOwnership(userId, dto.categoryId);
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        status: dto.status,
        targetValue: dto.targetValue,
        unit: dto.unit,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        recurrenceDaysOfWeek: dto.recurrenceDaysOfWeek,
        recurrenceDayOfMonth: dto.recurrenceDayOfMonth,
        recurrenceMonth: dto.recurrenceMonth,
        recurrenceStartDate: dto.recurrenceStartDate
          ? new Date(dto.recurrenceStartDate)
          : undefined,
        recurrenceEndDate: dto.recurrenceEndDate
          ? new Date(dto.recurrenceEndDate)
          : undefined,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.task.delete({ where: { id } });
  }

  // Cascade do schema (TaskCompletion.taskId -> Task) já remove as
  // conclusões filhas, sem deixar órfãos.
  async removeAll(userId: string): Promise<{ deletedCount: number }> {
    const { count } = await this.prisma.task.deleteMany({ where: { userId } });
    return { deletedCount: count };
  }

  // --- Conclusão: avulsa (occurrenceDate implícita, sem parâmetro) ---

  // Conclusão binária não faz sentido numa task quantitativa: ela conclui ao
  // bater o alvo, via /progress. Mesma família de mensagens de guarda usada
  // para avulsa vs. recorrente.
  private assertBoolean(task: Task, progressRoute: string): void {
    if (task.kind === 'QUANTITATIVE') {
      throw new BadRequestException(
        `Task quantitativa: use POST ${progressRoute}`,
      );
    }
  }

  async completeOneOff(userId: string, id: string): Promise<void> {
    const task = await this.findOwnedOrThrow(userId, id);
    if (task.recurrenceFrequency != null) {
      throw new BadRequestException(
        'Task recorrente: use POST /tasks/:id/occurrences/:date/complete',
      );
    }
    this.assertBoolean(task, '/tasks/:id/progress');
    await this.createCompletion(id, oneOffOccurrenceDate(task));
  }

  async uncompleteOneOff(userId: string, id: string): Promise<void> {
    const task = await this.findOwnedOrThrow(userId, id);
    if (task.recurrenceFrequency != null) {
      throw new BadRequestException(
        'Task recorrente: use DELETE /tasks/:id/occurrences/:date/complete',
      );
    }
    this.assertBoolean(task, '/tasks/:id/progress');
    await this.deleteCompletion(id, oneOffOccurrenceDate(task));
  }

  // --- Conclusão: recorrente (occurrenceDate explícita) ---

  async completeOccurrence(
    userId: string,
    id: string,
    dateStr: string,
  ): Promise<void> {
    const task = await this.findOwnedOrThrow(userId, id);
    if (task.recurrenceFrequency == null) {
      throw new BadRequestException(
        'Task avulsa: use POST /tasks/:id/complete',
      );
    }
    this.assertBoolean(task, '/tasks/:id/occurrences/:date/progress');
    this.assertValidOccurrence(task, dateStr);
    await this.createCompletion(id, dateStr);
  }

  async uncompleteOccurrence(
    userId: string,
    id: string,
    dateStr: string,
  ): Promise<void> {
    const task = await this.findOwnedOrThrow(userId, id);
    if (task.recurrenceFrequency == null) {
      throw new BadRequestException(
        'Task avulsa: use DELETE /tasks/:id/complete',
      );
    }
    this.assertBoolean(task, '/tasks/:id/occurrences/:date/progress');
    await this.deleteCompletion(id, dateStr);
  }

  private assertValidOccurrence(task: Task, dateStr: string): void {
    const rule = toRecurrenceRule(task);
    const matches = expandOccurrences(rule, dateStr, dateStr);
    if (matches.length === 0) {
      throw new BadRequestException(
        `${dateStr} não é uma ocorrência válida desta task`,
      );
    }
  }

  private async createCompletion(
    taskId: string,
    dateStr: string,
  ): Promise<void> {
    try {
      await this.prisma.taskCompletion.create({
        data: { taskId, occurrenceDate: new Date(dateStr) },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Ocorrência já concluída');
      }
      throw error;
    }
  }

  private async deleteCompletion(
    taskId: string,
    dateStr: string,
  ): Promise<void> {
    // Idempotente: desfazer uma conclusão inexistente não é erro.
    await this.prisma.taskCompletion.deleteMany({
      where: { taskId, occurrenceDate: new Date(dateStr) },
    });
  }

  // --- Progresso (tasks QUANTITATIVE) ---

  async upsertOneOffProgress(
    userId: string,
    id: string,
    dto: UpsertProgressDto,
  ): Promise<TaskProgressResult> {
    const task = await this.findOwnedOrThrow(userId, id);
    if (task.recurrenceFrequency != null) {
      throw new BadRequestException(
        'Task recorrente: use POST /tasks/:id/occurrences/:date/progress',
      );
    }
    return this.upsertProgress(task, oneOffOccurrenceDate(task), dto);
  }

  async upsertOccurrenceProgress(
    userId: string,
    id: string,
    dateStr: string,
    dto: UpsertProgressDto,
  ): Promise<TaskProgressResult> {
    const task = await this.findOwnedOrThrow(userId, id);
    if (task.recurrenceFrequency == null) {
      throw new BadRequestException(
        'Task avulsa: use POST /tasks/:id/progress',
      );
    }
    this.assertValidOccurrence(task, dateStr);
    return this.upsertProgress(task, dateStr, dto);
  }

  private async upsertProgress(
    task: Task,
    dateStr: string,
    dto: UpsertProgressDto,
  ): Promise<TaskProgressResult> {
    if (task.kind !== 'QUANTITATIVE') {
      throw new BadRequestException(
        'Task booleana: use POST /tasks/:id/complete',
      );
    }
    // XOR — mesma convenção de "avulsa XOR recorrente".
    if ((dto.delta === undefined) === (dto.value === undefined)) {
      throw new BadRequestException('Informe exatamente um de delta ou value');
    }

    const occurrenceDate = new Date(dateStr);
    const target = targetOf(task);

    // Transação: o incremento e a (des)conclusão derivada dele têm que ser
    // atômicos, senão um erro no meio deixa progresso sem a conclusão
    // correspondente (ou vice-versa).
    const currentValue = await this.prisma.$transaction(async (tx) => {
      const raw =
        dto.delta !== undefined
          ? // increment no banco, não read-modify-write: dois toques
            // simultâneos no "+1" não podem perder um do outro.
            await tx.taskProgress.upsert({
              where: {
                taskId_occurrenceDate: { taskId: task.id, occurrenceDate },
              },
              create: { taskId: task.id, occurrenceDate, value: dto.delta },
              update: { value: { increment: dto.delta } },
            })
          : await tx.taskProgress.upsert({
              where: {
                taskId_occurrenceDate: { taskId: task.id, occurrenceDate },
              },
              create: { taskId: task.id, occurrenceDate, value: dto.value },
              update: { value: dto.value },
            });

      // O clamp é feito depois do increment atômico: só assim ele leva em
      // conta o valor real acumulado no banco, não o que o cliente achava
      // que estava lá.
      let value = clampToTarget(raw.value, target);
      if (!value.equals(raw.value)) {
        const fixed = await tx.taskProgress.update({
          where: { id: raw.id },
          data: { value },
        });
        value = fixed.value;
      }

      if (reachedTarget(value, target)) {
        // Idempotente: bater o alvo de novo não é conflito, diferente da
        // conclusão manual de uma task booleana.
        await tx.taskCompletion.upsert({
          where: {
            taskId_occurrenceDate: { taskId: task.id, occurrenceDate },
          },
          create: { taskId: task.id, occurrenceDate },
          update: {},
        });
      } else {
        await tx.taskCompletion.deleteMany({
          where: { taskId: task.id, occurrenceDate },
        });
      }

      return value;
    });

    return {
      taskId: task.id,
      occurrenceDate: dateStr,
      currentValue,
      targetValue: target,
      completed: reachedTarget(currentValue, target),
    };
  }

  // --- Visão expandida/calendário ---

  async getOccurrences(
    userId: string,
    query: GetOccurrencesQueryDto,
  ): Promise<TaskOccurrence[]> {
    const { from, to, categoryId } = query;

    const [oneOffTasks, recurringTasks] = await Promise.all([
      this.prisma.task.findMany({
        where: { userId, categoryId, recurrenceFrequency: null },
      }),
      this.prisma.task.findMany({
        where: {
          userId,
          categoryId,
          recurrenceFrequency: { not: null },
          recurrenceStartDate: { lte: new Date(to) },
          OR: [
            { recurrenceEndDate: null },
            { recurrenceEndDate: { gte: new Date(from) } },
          ],
        },
      }),
    ]);

    // Volume por usuário é pequeno (lista pessoal de tarefas) — expandir em
    // memória é mais simples que empurrar essa lógica pro SQL, e evita
    // duplicar a implementação de expandOccurrences em PL/pgSQL.
    const candidates: { task: Task; occurrenceDate: string }[] = [];

    for (const task of oneOffTasks) {
      const occurrenceDate = oneOffOccurrenceDate(task);
      if (occurrenceDate >= from && occurrenceDate <= to) {
        candidates.push({ task, occurrenceDate });
      }
    }

    for (const task of recurringTasks) {
      const rule = toRecurrenceRule(task);
      for (const occurrenceDate of expandOccurrences(rule, from, to)) {
        candidates.push({ task, occurrenceDate });
      }
    }

    const taskIds = [...new Set(candidates.map((c) => c.task.id))];
    const dateRange = { gte: new Date(from), lte: new Date(to) };
    const [completions, progressRows] = await Promise.all([
      this.prisma.taskCompletion.findMany({
        where: { taskId: { in: taskIds }, occurrenceDate: dateRange },
      }),
      this.prisma.taskProgress.findMany({
        where: { taskId: { in: taskIds }, occurrenceDate: dateRange },
      }),
    ]);
    const completedKeys = new Set(
      completions.map((c) => `${c.taskId}:${formatDateOnly(c.occurrenceDate)}`),
    );
    const valueByKey = new Map(
      progressRows.map((p) => [
        `${p.taskId}:${formatDateOnly(p.occurrenceDate)}`,
        p.value,
      ]),
    );

    return candidates
      .map(({ task, occurrenceDate }) => {
        const key = `${task.id}:${occurrenceDate}`;
        const quantitative = task.kind === 'QUANTITATIVE';
        return {
          taskId: task.id,
          title: task.title,
          description: task.description,
          categoryId: task.categoryId,
          occurrenceDate,
          completed: completedKeys.has(key),
          kind: task.kind,
          targetValue: task.targetValue,
          unit: task.unit,
          // Ocorrência quantitativa ainda sem nenhum incremento não tem linha
          // em TaskProgress — reporta 0, não null, para a UI não ter que
          // tratar dois "vazios" diferentes.
          currentValue: quantitative
            ? (valueByKey.get(key) ?? new Prisma.Decimal(0))
            : null,
        };
      })
      .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
  }
}
