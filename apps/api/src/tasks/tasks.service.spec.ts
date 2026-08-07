import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, type Task } from '@prisma/client';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

type PrismaMock = {
  task: Record<string, jest.Mock>;
  taskCompletion: Record<string, jest.Mock>;
  taskProgress: Record<string, jest.Mock>;
  category: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  const mock: PrismaMock = {
    task: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    taskCompletion: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    taskProgress: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    // O service usa $transaction(callback) — o mock só executa o callback
    // com o próprio client, o que basta para observar as chamadas feitas
    // dentro da transação.
    $transaction: jest.fn((callback: (tx: PrismaMock) => unknown) =>
      callback(mock),
    ),
  };
  return mock;
}

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    userId: 'user-1',
    categoryId: null,
    title: 'Título',
    description: null,
    status: 'TODO',
    kind: 'BOOLEAN',
    targetValue: null,
    unit: null,
    dueDate: null,
    recurrenceFrequency: null,
    recurrenceDaysOfWeek: [],
    recurrenceDayOfMonth: null,
    recurrenceMonth: null,
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Task;
}

function quantitativeTask(overrides: Partial<Task> = {}): Task {
  return baseTask({
    kind: 'QUANTITATIVE',
    targetValue: new Prisma.Decimal(2),
    unit: 'LITERS',
    ...overrides,
  });
}

describe('TasksService', () => {
  let prisma: PrismaMock;
  let service: TasksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TasksService(prisma as unknown as PrismaService);
  });

  describe('create — validação de forma (avulsa vs recorrente)', () => {
    it('rejeita campos de recorrência numa task sem recurrenceFrequency', async () => {
      const dto = {
        title: 'X',
        recurrenceDaysOfWeek: [1],
      } as CreateTaskDto;

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejeita dueDate junto de recurrenceFrequency', async () => {
      const dto: CreateTaskDto = {
        title: 'X',
        dueDate: '2026-01-01',
        recurrenceFrequency: 'DAILY',
        recurrenceStartDate: '2026-01-01',
      };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('exige recurrenceStartDate em modo recorrente', async () => {
      const dto: CreateTaskDto = {
        title: 'X',
        recurrenceFrequency: 'DAILY',
      };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('WEEKLY exige recurrenceDaysOfWeek não vazio', async () => {
      const dto: CreateTaskDto = {
        title: 'X',
        recurrenceFrequency: 'WEEKLY',
        recurrenceStartDate: '2026-01-01',
      };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('YEARLY exige recurrenceMonth e recurrenceDayOfMonth', async () => {
      const dto: CreateTaskDto = {
        title: 'X',
        recurrenceFrequency: 'YEARLY',
        recurrenceStartDate: '2026-01-01',
        recurrenceDayOfMonth: 25,
      };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cria normalmente uma task avulsa válida', async () => {
      prisma.task.create.mockResolvedValue(baseTask());
      const dto: CreateTaskDto = { title: 'Comprar leite' };

      await service.create('user-1', dto);

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            title: 'Comprar leite',
          }),
        }),
      );
    });

    it('cria normalmente uma task recorrente MONTHLY válida', async () => {
      prisma.task.create.mockResolvedValue(baseTask());
      const dto: CreateTaskDto = {
        title: 'Pagar aluguel',
        recurrenceFrequency: 'MONTHLY',
        recurrenceStartDate: '2026-01-01',
        recurrenceDayOfMonth: 31,
      };

      await service.create('user-1', dto);
      expect(prisma.task.create).toHaveBeenCalled();
    });

    it('404 se categoryId informado não pertence ao usuário', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      const dto: CreateTaskDto = { title: 'X', categoryId: 'cat-de-outro' };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOwnedOrThrow', () => {
    it('404 se a task não existe ou é de outro usuário', async () => {
      prisma.task.findFirst.mockResolvedValue(null);
      await expect(
        service.findOwnedOrThrow('user-1', 'task-de-outro'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('conclusão avulsa vs recorrente — endpoint certo pro modo certo', () => {
    it('completeOneOff rejeita task recorrente (400, direciona pro endpoint de ocorrência)', async () => {
      prisma.task.findFirst.mockResolvedValue(
        baseTask({
          recurrenceFrequency: 'DAILY',
          recurrenceStartDate: new Date('2026-01-01'),
        }),
      );
      await expect(service.completeOneOff('user-1', 'task-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('completeOccurrence rejeita task avulsa (400, direciona pro endpoint simples)', async () => {
      prisma.task.findFirst.mockResolvedValue(baseTask());
      await expect(
        service.completeOccurrence('user-1', 'task-1', '2026-01-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('completeOccurrence rejeita data que não bate com a regra de recorrência', async () => {
      prisma.task.findFirst.mockResolvedValue(
        baseTask({
          recurrenceFrequency: 'WEEKLY',
          recurrenceDaysOfWeek: [1], // só segundas
          recurrenceStartDate: new Date('2026-01-01'),
        }),
      );
      // 2026-01-03 é sábado, não bate com [segunda]
      await expect(
        service.completeOccurrence('user-1', 'task-1', '2026-01-03'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.taskCompletion.create).not.toHaveBeenCalled();
    });

    it('completeOccurrence aceita uma data válida da regra', async () => {
      prisma.task.findFirst.mockResolvedValue(
        baseTask({
          recurrenceFrequency: 'WEEKLY',
          recurrenceDaysOfWeek: [1],
          recurrenceStartDate: new Date('2026-01-01'),
        }),
      );
      prisma.taskCompletion.create.mockResolvedValue({});
      // 2026-01-05 é segunda
      await service.completeOccurrence('user-1', 'task-1', '2026-01-05');
      expect(prisma.taskCompletion.create).toHaveBeenCalledWith({
        data: { taskId: 'task-1', occurrenceDate: new Date('2026-01-05') },
      });
    });
  });

  describe('removeAll', () => {
    it('apaga apenas as tasks do usuário e devolve a contagem removida', async () => {
      prisma.task.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.removeAll('user-1');

      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual({ deletedCount: 3 });
    });
  });

  describe('update — modo é imutável', () => {
    it('rejeita dueDate em update de task recorrente', async () => {
      prisma.task.findFirst.mockResolvedValue(
        baseTask({
          recurrenceFrequency: 'DAILY',
          recurrenceStartDate: new Date('2026-01-01'),
        }),
      );
      await expect(
        service.update('user-1', 'task-1', { dueDate: '2026-02-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita campos de recorrência em update de task avulsa', async () => {
      prisma.task.findFirst.mockResolvedValue(baseTask());
      await expect(
        service.update('user-1', 'task-1', { recurrenceDayOfMonth: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create — validação de tipo (booleana vs quantitativa)', () => {
    it('QUANTITATIVE exige targetValue', async () => {
      const dto = {
        title: 'Beber água',
        kind: 'QUANTITATIVE',
        unit: 'LITERS',
      } as CreateTaskDto;

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('QUANTITATIVE exige unit', async () => {
      const dto = {
        title: 'Beber água',
        kind: 'QUANTITATIVE',
        targetValue: 2,
      } as CreateTaskDto;

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('BOOLEAN rejeita targetValue/unit', async () => {
      const dto = {
        title: 'Escovar dente',
        targetValue: 2,
        unit: 'LITERS',
      } as CreateTaskDto;

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cria uma task quantitativa válida', async () => {
      prisma.task.create.mockResolvedValue(quantitativeTask());
      const dto = {
        title: 'Beber água',
        kind: 'QUANTITATIVE',
        targetValue: 2,
        unit: 'LITERS',
      } as CreateTaskDto;

      await service.create('user-1', dto);

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'QUANTITATIVE',
            targetValue: 2,
            unit: 'LITERS',
          }),
        }),
      );
    });

    // A sugestão por CategoryType é só ordenação na UI — o backend não
    // restringe unidade por categoria (ver plano, Requisito 4).
    it('aceita qualquer unidade do catálogo, mesmo fora da sugestão da categoria', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        userId: 'user-1',
        type: 'STUDY',
      });
      prisma.task.create.mockResolvedValue(quantitativeTask());
      const dto = {
        title: 'Beber água estudando',
        categoryId: 'cat-1',
        kind: 'QUANTITATIVE',
        targetValue: 2,
        unit: 'LITERS', // não está em SUGGESTED_UNITS_BY_CATEGORY_TYPE.STUDY
      } as CreateTaskDto;

      await expect(service.create('user-1', dto)).resolves.toBeDefined();
    });
  });

  describe('conclusão booleana vs progresso quantitativo', () => {
    it('completeOneOff rejeita task quantitativa', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      await expect(service.completeOneOff('user-1', 'task-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.taskCompletion.create).not.toHaveBeenCalled();
    });

    it('uncompleteOneOff rejeita task quantitativa', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      await expect(
        service.uncompleteOneOff('user-1', 'task-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.taskCompletion.deleteMany).not.toHaveBeenCalled();
    });

    it('progresso rejeita task booleana', async () => {
      prisma.task.findFirst.mockResolvedValue(baseTask());
      await expect(
        service.upsertOneOffProgress('user-1', 'task-1', { delta: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('completeOneOff continua funcionando em task booleana', async () => {
      prisma.task.findFirst.mockResolvedValue(baseTask());
      await service.completeOneOff('user-1', 'task-1');
      expect(prisma.taskCompletion.create).toHaveBeenCalled();
    });
  });

  describe('upsertOneOffProgress', () => {
    it('exige exatamente um de delta ou value', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());

      await expect(
        service.upsertOneOffProgress('user-1', 'task-1', {}),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upsertOneOffProgress('user-1', 'task-1', {
          delta: 1,
          value: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('delta abaixo do alvo acumula sem concluir', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(1),
      });

      const result = await service.upsertOneOffProgress('user-1', 'task-1', {
        delta: 1,
      });

      expect(result.currentValue.toString()).toBe('1');
      expect(result.completed).toBe(false);
      expect(prisma.taskCompletion.upsert).not.toHaveBeenCalled();
      expect(prisma.taskCompletion.deleteMany).toHaveBeenCalled();
    });

    it('usa increment atômico no delta, não read-modify-write', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(1),
      });

      await service.upsertOneOffProgress('user-1', 'task-1', { delta: 1 });

      expect(prisma.taskProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: { increment: 1 } } }),
      );
    });

    it('cruzar o alvo cria a conclusão', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(2),
      });

      const result = await service.upsertOneOffProgress('user-1', 'task-1', {
        delta: 1,
      });

      expect(result.completed).toBe(true);
      expect(prisma.taskCompletion.upsert).toHaveBeenCalled();
      expect(prisma.taskCompletion.deleteMany).not.toHaveBeenCalled();
    });

    it('cair abaixo do alvo apaga a conclusão', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(0),
      });

      const result = await service.upsertOneOffProgress('user-1', 'task-1', {
        value: 0,
      });

      expect(result.completed).toBe(false);
      expect(prisma.taskCompletion.deleteMany).toHaveBeenCalled();
      expect(prisma.taskCompletion.upsert).not.toHaveBeenCalled();
    });

    it('clampa no alvo quando o incremento passa do total', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(5), // alvo é 2
      });
      prisma.taskProgress.update.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(2),
      });

      const result = await service.upsertOneOffProgress('user-1', 'task-1', {
        delta: 5,
      });

      expect(prisma.taskProgress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { value: new Prisma.Decimal(2) },
        }),
      );
      expect(result.currentValue.toString()).toBe('2');
      expect(result.completed).toBe(true);
    });

    it('clampa em zero quando o delta negativo passa do fundo', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(-3),
      });
      prisma.taskProgress.update.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(0),
      });

      const result = await service.upsertOneOffProgress('user-1', 'task-1', {
        delta: -5,
      });

      expect(result.currentValue.toString()).toBe('0');
      expect(result.completed).toBe(false);
    });

    it('rejeita task recorrente (direciona pro endpoint de ocorrência)', async () => {
      prisma.task.findFirst.mockResolvedValue(
        quantitativeTask({
          recurrenceFrequency: 'DAILY',
          recurrenceStartDate: new Date('2026-01-01'),
        }),
      );
      await expect(
        service.upsertOneOffProgress('user-1', 'task-1', { delta: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('upsertOccurrenceProgress', () => {
    it('rejeita data que não bate com a regra de recorrência', async () => {
      prisma.task.findFirst.mockResolvedValue(
        quantitativeTask({
          recurrenceFrequency: 'WEEKLY',
          recurrenceDaysOfWeek: [1], // só segundas
          recurrenceStartDate: new Date('2026-01-01'),
        }),
      );
      // 2026-01-07 é uma quarta-feira
      await expect(
        service.upsertOccurrenceProgress('user-1', 'task-1', '2026-01-07', {
          delta: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita task avulsa (direciona pro endpoint simples)', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      await expect(
        service.upsertOccurrenceProgress('user-1', 'task-1', '2026-01-05', {
          delta: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update — alvo trava depois que há progresso', () => {
    it('rejeita alterar targetValue com progresso registrado', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.findFirst.mockResolvedValue({ id: 'progress-1' });

      await expect(
        service.update('user-1', 'task-1', { targetValue: 3 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite alterar targetValue enquanto não há progresso', async () => {
      prisma.task.findFirst.mockResolvedValue(quantitativeTask());
      prisma.taskProgress.findFirst.mockResolvedValue(null);
      prisma.task.update.mockResolvedValue(
        quantitativeTask({ targetValue: new Prisma.Decimal(3) }),
      );

      await expect(
        service.update('user-1', 'task-1', { targetValue: 3 }),
      ).resolves.toBeDefined();
    });

    it('rejeita targetValue/unit em task booleana', async () => {
      prisma.task.findFirst.mockResolvedValue(baseTask());

      await expect(
        service.update('user-1', 'task-1', { unit: 'KM' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOccurrences — campos quantitativos', () => {
    it('reporta currentValue 0 numa ocorrência quantitativa sem progresso', async () => {
      prisma.task.findMany
        .mockResolvedValueOnce([
          quantitativeTask({ dueDate: new Date('2026-01-05') }),
        ])
        .mockResolvedValueOnce([]);
      prisma.taskCompletion.findMany.mockResolvedValue([]);
      prisma.taskProgress.findMany.mockResolvedValue([]);

      const [occurrence] = await service.getOccurrences('user-1', {
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(occurrence.kind).toBe('QUANTITATIVE');
      expect(occurrence.currentValue?.toString()).toBe('0');
      expect(occurrence.targetValue?.toString()).toBe('2');
      expect(occurrence.unit).toBe('LITERS');
      expect(occurrence.completed).toBe(false);
    });

    it('task booleana reporta currentValue null', async () => {
      prisma.task.findMany
        .mockResolvedValueOnce([baseTask({ dueDate: new Date('2026-01-05') })])
        .mockResolvedValueOnce([]);
      prisma.taskCompletion.findMany.mockResolvedValue([]);
      prisma.taskProgress.findMany.mockResolvedValue([]);

      const [occurrence] = await service.getOccurrences('user-1', {
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(occurrence.kind).toBe('BOOLEAN');
      expect(occurrence.currentValue).toBeNull();
      expect(occurrence.targetValue).toBeNull();
    });

    it('reflete o progresso acumulado da ocorrência', async () => {
      prisma.task.findMany
        .mockResolvedValueOnce([
          quantitativeTask({ dueDate: new Date('2026-01-05') }),
        ])
        .mockResolvedValueOnce([]);
      prisma.taskCompletion.findMany.mockResolvedValue([]);
      prisma.taskProgress.findMany.mockResolvedValue([
        {
          taskId: 'task-1',
          occurrenceDate: new Date('2026-01-05'),
          value: new Prisma.Decimal('1.50'),
        },
      ]);

      const [occurrence] = await service.getOccurrences('user-1', {
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(occurrence.currentValue?.toString()).toBe('1.5');
    });
  });
});
