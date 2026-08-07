import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Challenge } from '@prisma/client';
import { ChallengesService } from './challenges.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { LeaderboardService } from '../leaderboard/leaderboard.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';

type PrismaMock = {
  challenge: Record<string, jest.Mock>;
  challengeTask: Record<string, jest.Mock>;
  challengeCompletion: Record<string, jest.Mock>;
  challengeProgress: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  return {
    challenge: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    challengeTask: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    challengeCompletion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    challengeProgress: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function quantitativeChallengeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    challengeId: 'challenge-1',
    title: 'Correr',
    description: null,
    points: 1,
    kind: 'QUANTITATIVE',
    targetValue: new Prisma.Decimal(5),
    unit: 'KM',
    ...overrides,
  };
}

function baseChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'challenge-1',
    groupId: 'group-1',
    title: 'Desafio',
    description: null,
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-01-31T23:59:59.000Z'),
    createdByMemberId: 'member-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Challenge;
}

describe('ChallengesService', () => {
  let prisma: PrismaMock;
  let leaderboardService: { invalidate: jest.Mock };
  let service: ChallengesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    leaderboardService = { invalidate: jest.fn().mockResolvedValue(undefined) };
    service = new ChallengesService(
      prisma as unknown as PrismaService,
      leaderboardService as unknown as LeaderboardService,
    );
  });

  describe('create', () => {
    it('rejeita endAt <= startAt', async () => {
      const dto: CreateChallengeDto = {
        title: 'X',
        startAt: '2026-02-01T00:00:00.000Z',
        endAt: '2026-01-01T00:00:00.000Z',
        tasks: [{ title: 'Correr 5km' }],
      };
      await expect(service.create('group-1', 'member-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rejeita mudar startAt/endAt se já existem conclusões', async () => {
      prisma.challengeCompletion.findFirst.mockResolvedValue({ id: 'c1' });
      await expect(
        service.update(baseChallenge(), {
          startAt: '2026-01-05T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.challenge.update).not.toHaveBeenCalled();
    });

    it('permite mudar startAt/endAt se não há conclusões', async () => {
      prisma.challengeCompletion.findFirst.mockResolvedValue(null);
      prisma.challenge.update.mockResolvedValue(baseChallenge());
      await service.update(baseChallenge(), {
        startAt: '2026-01-02T00:00:00.000Z',
      });
      expect(prisma.challenge.update).toHaveBeenCalled();
    });

    it('rejeita título/descrição sem tocar na janela normalmente (sem checar conclusões)', async () => {
      prisma.challenge.update.mockResolvedValue(baseChallenge());
      await service.update(baseChallenge(), { title: 'Novo título' });
      expect(prisma.challengeCompletion.findFirst).not.toHaveBeenCalled();
      expect(prisma.challenge.update).toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('404 se a tarefa não pertence ao desafio', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(null);
      await expect(
        service.complete(baseChallenge(), 'task-de-outro-desafio', 'member-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('400 se fora da janela do desafio (antes do início)', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue({ id: 'task-1' });
      const challenge = baseChallenge({
        startAt: new Date('2099-01-01T00:00:00.000Z'),
        endAt: new Date('2099-01-31T00:00:00.000Z'),
      });
      await expect(
        service.complete(challenge, 'task-1', 'member-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.challengeCompletion.create).not.toHaveBeenCalled();
    });

    it('400 se fora da janela do desafio (depois do fim)', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue({ id: 'task-1' });
      const challenge = baseChallenge({
        startAt: new Date('2020-01-01T00:00:00.000Z'),
        endAt: new Date('2020-01-31T00:00:00.000Z'),
      });
      await expect(
        service.complete(challenge, 'task-1', 'member-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('409 se já concluída (constraint única)', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue({ id: 'task-1' });
      const challenge = baseChallenge({
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      });
      const prismaError = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'x',
      });
      prisma.challengeCompletion.create.mockRejectedValue(prismaError);

      await expect(
        service.complete(challenge, 'task-1', 'member-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('cria a conclusão quando dentro da janela e sem duplicidade', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue({ id: 'task-1' });
      const challenge = baseChallenge({
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      });
      prisma.challengeCompletion.create.mockResolvedValue({});

      await service.complete(challenge, 'task-1', 'member-1');

      expect(prisma.challengeCompletion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            challengeId: 'challenge-1',
            challengeTaskId: 'task-1',
            groupMemberId: 'member-1',
          }),
        }),
      );
      expect(leaderboardService.invalidate).toHaveBeenCalledWith('challenge-1');
    });
  });

  describe('ChallengeTask quantitativa', () => {
    const activeChallenge = () =>
      baseChallenge({
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      });

    beforeEach(() => {
      prisma.$transaction.mockImplementation(
        (callback: (tx: PrismaMock) => unknown) => callback(prisma),
      );
    });

    it('addTask exige targetValue e unit em QUANTITATIVE', () => {
      expect(() =>
        service.addTask('challenge-1', {
          title: 'Correr',
          kind: 'QUANTITATIVE',
        }),
      ).toThrow(BadRequestException);
    });

    it('addTask rejeita targetValue/unit em task booleana', () => {
      expect(() =>
        service.addTask('challenge-1', {
          title: 'Correr',
          targetValue: 5,
          unit: 'KM',
        }),
      ).toThrow(BadRequestException);
    });

    it('addTask persiste kind/targetValue/unit', async () => {
      prisma.challengeTask.create.mockResolvedValue(
        quantitativeChallengeTask(),
      );

      await service.addTask('challenge-1', {
        title: 'Correr',
        kind: 'QUANTITATIVE',
        targetValue: 5,
        unit: 'KM',
      });

      expect(prisma.challengeTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'QUANTITATIVE',
            targetValue: 5,
            unit: 'KM',
          }),
        }),
      );
    });

    it('complete rejeita task quantitativa', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );

      await expect(
        service.complete(activeChallenge(), 'task-1', 'member-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.challengeCompletion.create).not.toHaveBeenCalled();
    });

    it('upsertProgress rejeita task booleana', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask({
          kind: 'BOOLEAN',
          targetValue: null,
          unit: null,
        }),
      );

      await expect(
        service.upsertProgress(activeChallenge(), 'task-1', 'member-1', {
          delta: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // A garantia de "só hoje UTC" sozinha não bastaria: um desafio encerrado
    // ontem ainda teria "hoje" como data válida de escrita. Quem fecha esse
    // caso é a checagem de janela contra endAt.
    it('upsertProgress rejeita desafio já encerrado', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );

      await expect(
        service.upsertProgress(
          baseChallenge({
            startAt: new Date(Date.now() - 7 * 86_400_000),
            endAt: new Date(Date.now() - 86_400_000), // terminou ontem
          }),
          'task-1',
          'member-1',
          { delta: 1 },
        ),
      ).rejects.toThrow('Fora da janela do desafio');
      expect(prisma.challengeProgress.upsert).not.toHaveBeenCalled();
    });

    it('upsertProgress rejeita fora da janela do desafio', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );

      await expect(
        service.upsertProgress(
          baseChallenge({
            startAt: new Date(Date.now() + 86_400_000),
            endAt: new Date(Date.now() + 172_800_000),
          }),
          'task-1',
          'member-1',
          { delta: 1 },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    // Progresso parcial não gera ChallengeCompletion (a conclusão é binária),
    // mas AGORA pontua no leaderboard, que agrega SUM(ChallengeProgress.value)
    // para tasks quantitativas — ver leaderboard.service.spec.ts.
    it('progresso parcial não gera conclusão', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );
      prisma.challengeProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(3), // alvo é 5
      });

      const result = await service.upsertProgress(
        activeChallenge(),
        'task-1',
        'member-1',
        { delta: 3 },
      );

      expect(result.completed).toBe(false);
      expect(prisma.challengeCompletion.upsert).not.toHaveBeenCalled();
    });

    // Garantia estrutural contra manipulação de ranking: não existe caminho
    // que apague uma conclusão de desafio já contabilizada.
    it('nunca apaga uma ChallengeCompletion', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );
      prisma.challengeProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(3),
      });

      await service.upsertProgress(activeChallenge(), 'task-1', 'member-1', {
        delta: 3,
      });

      expect(prisma.challengeCompletion.deleteMany).not.toHaveBeenCalled();
    });

    it('grava challengeId na linha de progresso (denormalizado p/ o leaderboard)', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );
      prisma.challengeProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(3),
      });

      await service.upsertProgress(activeChallenge(), 'task-1', 'member-1', {
        delta: 3,
      });

      expect(prisma.challengeProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ challengeId: 'challenge-1' }),
          update: { value: { increment: 3 } },
        }),
      );
    });

    // Não existe parâmetro de data na rota: progressOn é sempre derivado no
    // servidor, então ocorrências passadas são inalcançáveis por construção.
    it('grava sempre no dia UTC de hoje', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );
      prisma.challengeProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(3),
      });

      const result = await service.upsertProgress(
        activeChallenge(),
        'task-1',
        'member-1',
        { delta: 3 },
      );

      const todayUtc = new Date().toISOString().slice(0, 10);
      expect(result.progressOn).toBe(todayUtc);
      expect(prisma.challengeProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            challengeTaskId_groupMemberId_progressOn: expect.objectContaining({
              progressOn: new Date(todayUtc),
            }),
          },
        }),
      );
    });

    it('bater o alvo gera a conclusão e invalida o leaderboard', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );
      prisma.challengeProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(5),
      });

      const result = await service.upsertProgress(
        activeChallenge(),
        'task-1',
        'member-1',
        { delta: 2 },
      );

      expect(result.completed).toBe(true);
      expect(prisma.challengeCompletion.upsert).toHaveBeenCalled();
      expect(leaderboardService.invalidate).toHaveBeenCalledWith('challenge-1');
    });

    // Sem teto: o ranking é por SUM(value), então limitar no alvo empataria
    // todo mundo que bate a meta e descartaria o excedente que decide "quem
    // bebeu mais".
    it('não clampa no alvo — o excedente conta integralmente', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );
      prisma.challengeProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        value: new Prisma.Decimal(9), // alvo é 5
      });

      const result = await service.upsertProgress(
        activeChallenge(),
        'task-1',
        'member-1',
        { delta: 9 },
      );

      expect(result.currentValue.toString()).toBe('9');
      expect(result.completed).toBe(true);
      expect(prisma.challengeProgress.update).not.toHaveBeenCalled();
    });

    // Não há como zerar/desfazer progresso de desafio — a mensagem de
    // uncomplete não pode mais sugerir `value: 0`, que o DTO nem aceita.
    it('uncomplete de task quantitativa avisa que o progresso é imutável', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );

      await expect(
        service.uncomplete(activeChallenge(), 'task-1', 'member-1'),
      ).rejects.toThrow(/imutável/);
      expect(prisma.challengeCompletion.deleteMany).not.toHaveBeenCalled();
    });

    // Simetria com `complete`: se não dá para concluir fora da janela, não
    // pode dar para desfazer. Sem isso, um desafio encerrado mais cedo hoje
    // ainda aceitaria remover a conclusão do dia do placar final.
    it('uncomplete de task booleana rejeita desafio já encerrado', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask({
          kind: 'BOOLEAN',
          targetValue: null,
          unit: null,
        }),
      );

      await expect(
        service.uncomplete(
          baseChallenge({
            startAt: new Date(Date.now() - 7 * 86_400_000),
            endAt: new Date(Date.now() - 3_600_000), // encerrou 1h atrás
          }),
          'task-1',
          'member-1',
        ),
      ).rejects.toThrow('Fora da janela do desafio');
      expect(prisma.challengeCompletion.deleteMany).not.toHaveBeenCalled();
    });

    it('uncomplete de task booleana continua funcionando dentro da janela', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask({
          kind: 'BOOLEAN',
          targetValue: null,
          unit: null,
        }),
      );

      await service.uncomplete(activeChallenge(), 'task-1', 'member-1');

      expect(prisma.challengeCompletion.deleteMany).toHaveBeenCalled();
      expect(leaderboardService.invalidate).toHaveBeenCalledWith('challenge-1');
    });

    it('updateTask trava targetValue depois que há progresso', async () => {
      prisma.challengeTask.findFirst.mockResolvedValue(
        quantitativeChallengeTask(),
      );
      prisma.challengeProgress.findFirst.mockResolvedValue({ id: 'p-1' });

      await expect(
        service.updateTask('challenge-1', 'task-1', { targetValue: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('myProgress reporta valueToday e o alvo', async () => {
      prisma.challengeTask.findMany.mockResolvedValue([
        quantitativeChallengeTask(),
      ]);
      prisma.challengeCompletion.findMany.mockResolvedValue([]);
      prisma.challengeProgress.findMany.mockResolvedValue([
        { challengeTaskId: 'task-1', value: new Prisma.Decimal('2.50') },
      ]);

      const [progress] = await service.myProgress('challenge-1', 'member-1');

      expect(progress.kind).toBe('QUANTITATIVE');
      expect(progress.valueToday?.toString()).toBe('2.5');
      expect(progress.targetValue?.toString()).toBe('5');
      expect(progress.unit).toBe('KM');
      expect(progress.completedToday).toBe(false);
    });

    it('myProgress reporta valueToday null em task booleana', async () => {
      prisma.challengeTask.findMany.mockResolvedValue([
        quantitativeChallengeTask({
          kind: 'BOOLEAN',
          targetValue: null,
          unit: null,
        }),
      ]);
      prisma.challengeCompletion.findMany.mockResolvedValue([]);
      prisma.challengeProgress.findMany.mockResolvedValue([]);

      const [progress] = await service.myProgress('challenge-1', 'member-1');

      expect(progress.valueToday).toBeNull();
    });
  });
});
