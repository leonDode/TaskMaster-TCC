import { Prisma, type Challenge } from '@prisma/client';
import { LeaderboardService } from './leaderboard.service';
import type { PrismaService } from '../prisma/prisma.service';

type PrismaMock = {
  challengeTask: { findMany: jest.Mock };
  groupMember: { findMany: jest.Mock };
  challengeCompletion: { groupBy: jest.Mock };
  challengeProgress: { groupBy: jest.Mock };
};

type CacheMock = {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
};

function member(id: string, displayName: string) {
  return { id, user: { displayName, avatarUrl: null } };
}

function booleanTask(id: string, title: string) {
  return { id, title, kind: 'BOOLEAN', unit: null, targetValue: null };
}

function quantitativeTask(
  id: string,
  title: string,
  unit: string,
  target: number,
) {
  return {
    id,
    title,
    kind: 'QUANTITATIVE',
    unit,
    targetValue: new Prisma.Decimal(target),
  };
}

const challenge = {
  id: 'challenge-1',
  groupId: 'group-1',
} as Challenge;

describe('LeaderboardService', () => {
  let prisma: PrismaMock;
  let cache: CacheMock;
  let service: LeaderboardService;

  beforeEach(() => {
    prisma = {
      challengeTask: { findMany: jest.fn().mockResolvedValue([]) },
      groupMember: { findMany: jest.fn().mockResolvedValue([]) },
      challengeCompletion: { groupBy: jest.fn().mockResolvedValue([]) },
      challengeProgress: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    service = new LeaderboardService(
      prisma as unknown as PrismaService,
      cache as never,
    );
  });

  describe('task QUANTITATIVE — ranking por soma acumulada', () => {
    beforeEach(() => {
      cache.get.mockResolvedValue(undefined);
      prisma.challengeTask.findMany.mockResolvedValue([
        quantitativeTask('task-agua', 'Beber água', 'LITERS', 2),
      ]);
      prisma.groupMember.findMany.mockResolvedValue([
        member('a', 'Alice'),
        member('b', 'Bob'),
      ]);
    });

    // O caso que a regressão quebrava: contando conclusões, Bob (1 L, nunca
    // bateu a meta) pontuava 0 e sumia da disputa.
    it('progresso parcial pontua', async () => {
      prisma.challengeProgress.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'a',
          _sum: { value: new Prisma.Decimal(6) },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'b',
          _sum: { value: new Prisma.Decimal(1) },
        },
      ]);

      const [board] = await service.getLeaderboard(challenge);

      expect(
        board.entries.map((e) => [e.groupMemberId, e.score.toString(), e.rank]),
      ).toEqual([
        ['a', '6', 1],
        ['b', '1', 2],
      ]);
    });

    // Prova que o teto no alvo sumiu: com clamp em 2 L/dia os dois empatariam.
    it('soma acima do alvo conta integralmente', async () => {
      prisma.challengeProgress.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'a',
          _sum: { value: new Prisma.Decimal(9) },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'b',
          _sum: { value: new Prisma.Decimal(6) },
        },
      ]);

      const [board] = await service.getLeaderboard(challenge);

      expect(board.entries[0].score.toString()).toBe('9');
      expect(board.entries[0].groupMemberId).toBe('a');
      expect(board.entries[1].score.toString()).toBe('6');
    });

    // Empate no lado quantitativo passa por Decimal.equals, não por ===,
    // então precisa de cobertura própria: "3" e "3.00" saem iguais do SUM
    // dependendo das casas decimais gravadas e têm que empatar de fato.
    it('empate aplica competition ranking (1,2,2,4), não denso (1,2,2,3)', async () => {
      prisma.groupMember.findMany.mockResolvedValue([
        member('a', 'Alice'),
        member('b', 'Bob'),
        member('c', 'Carol'),
        member('d', 'Dave'),
      ]);
      prisma.challengeProgress.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'a',
          _sum: { value: new Prisma.Decimal('6.5') },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'b',
          _sum: { value: new Prisma.Decimal('3') },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'c',
          _sum: { value: new Prisma.Decimal('3.00') },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'd',
          _sum: { value: new Prisma.Decimal('1') },
        },
      ]);

      const [board] = await service.getLeaderboard(challenge);
      const ranks = board.entries.map((e) => [e.groupMemberId, e.rank]);

      expect(ranks).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 2], // mesmo score que b -> mesmo rank
        ['d', 4], // pula o 3 (competition); ranking denso diria 3
      ]);
      expect(ranks).not.toContainEqual(['d', 3]);
    });

    it('empate triplo pula dois ranks (1,2,2,2,5)', async () => {
      prisma.groupMember.findMany.mockResolvedValue([
        member('a', 'Alice'),
        member('b', 'Bob'),
        member('c', 'Carol'),
        member('d', 'Dave'),
        member('e', 'Erin'),
      ]);
      prisma.challengeProgress.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'a',
          _sum: { value: new Prisma.Decimal(9) },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'b',
          _sum: { value: new Prisma.Decimal(4) },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'c',
          _sum: { value: new Prisma.Decimal(4) },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'd',
          _sum: { value: new Prisma.Decimal(4) },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'e',
          _sum: { value: new Prisma.Decimal(1) },
        },
      ]);

      const [board] = await service.getLeaderboard(challenge);

      expect(board.entries.map((e) => e.rank)).toEqual([1, 2, 2, 2, 5]);
    });

    // Todo mundo zerado é empate geral: ninguém pode virar "2º" por acaso
    // da ordem de listagem dos membros.
    it('todos com score 0 empatam no rank 1', async () => {
      prisma.challengeProgress.groupBy.mockResolvedValue([]);

      const [board] = await service.getLeaderboard(challenge);

      expect(board.entries.map((e) => e.rank)).toEqual([1, 1]);
    });

    it('agrega ChallengeProgress, não ChallengeCompletion', async () => {
      await service.getLeaderboard(challenge);

      expect(prisma.challengeProgress.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['challengeTaskId', 'groupMemberId'],
          _sum: { value: true },
        }),
      );
      // Sem task BOOLEAN no desafio, a query de contagem nem dispara.
      expect(prisma.challengeCompletion.groupBy).not.toHaveBeenCalled();
    });

    it('expõe unidade e alvo da task', async () => {
      const [board] = await service.getLeaderboard(challenge);

      expect(board).toMatchObject({
        challengeTaskId: 'task-agua',
        title: 'Beber água',
        kind: 'QUANTITATIVE',
        unit: 'LITERS',
      });
      expect(board.targetValue?.toString()).toBe('2');
    });
  });

  describe('task BOOLEAN — ranking por contagem (comportamento preservado)', () => {
    beforeEach(() => {
      cache.get.mockResolvedValue(undefined);
      prisma.challengeTask.findMany.mockResolvedValue([
        booleanTask('task-gym', 'Academia'),
      ]);
    });

    it('ordena por conclusões desc e aplica "competition ranking" (1,2,2,4)', async () => {
      prisma.groupMember.findMany.mockResolvedValue([
        member('a', 'Alice'),
        member('b', 'Bob'),
        member('c', 'Carol'),
        member('d', 'Dave'),
      ]);
      prisma.challengeCompletion.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-gym',
          groupMemberId: 'a',
          _count: { _all: 5 },
        },
        {
          challengeTaskId: 'task-gym',
          groupMemberId: 'b',
          _count: { _all: 3 },
        },
        {
          challengeTaskId: 'task-gym',
          groupMemberId: 'c',
          _count: { _all: 3 },
        },
        {
          challengeTaskId: 'task-gym',
          groupMemberId: 'd',
          _count: { _all: 1 },
        },
      ]);

      const [board] = await service.getLeaderboard(challenge);

      expect(
        board.entries.map((e) => [e.groupMemberId, e.score.toString(), e.rank]),
      ).toEqual([
        ['a', '5', 1],
        ['b', '3', 2],
        ['c', '3', 2],
        ['d', '1', 4],
      ]);
    });

    it('inclui membro sem nenhuma conclusão com score 0 no último rank', async () => {
      prisma.groupMember.findMany.mockResolvedValue([
        member('a', 'Alice'),
        member('b', 'Bob'),
      ]);
      prisma.challengeCompletion.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-gym',
          groupMemberId: 'a',
          _count: { _all: 2 },
        },
      ]);

      const [board] = await service.getLeaderboard(challenge);
      const bob = board.entries.find((e) => e.groupMemberId === 'b')!;

      expect(bob.score.toString()).toBe('0');
      expect(bob.rank).toBe(2);
    });

    it('não dispara a agregação de progresso quando não há task quantitativa', async () => {
      await service.getLeaderboard(challenge);
      expect(prisma.challengeProgress.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('desafio misto — uma lista por task, grandezas nunca somadas', () => {
    it('devolve rankings independentes, cada um com sua unidade', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.challengeTask.findMany.mockResolvedValue([
        quantitativeTask('task-agua', 'Beber água', 'LITERS', 2),
        quantitativeTask('task-corrida', 'Correr', 'KM', 5),
        booleanTask('task-gym', 'Academia'),
      ]);
      prisma.groupMember.findMany.mockResolvedValue([
        member('a', 'Alice'),
        member('b', 'Bob'),
      ]);
      prisma.challengeProgress.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'a',
          _sum: { value: new Prisma.Decimal(6) },
        },
        {
          challengeTaskId: 'task-agua',
          groupMemberId: 'b',
          _sum: { value: new Prisma.Decimal(9) },
        },
        {
          challengeTaskId: 'task-corrida',
          groupMemberId: 'a',
          _sum: { value: new Prisma.Decimal(20) },
        },
      ]);
      prisma.challengeCompletion.groupBy.mockResolvedValue([
        {
          challengeTaskId: 'task-gym',
          groupMemberId: 'a',
          _count: { _all: 4 },
        },
      ]);

      const boards = await service.getLeaderboard(challenge);

      expect(boards).toHaveLength(3);
      const [agua, corrida, gym] = boards;

      // Litros: Bob à frente. Km: Alice à frente. Os 20 km da Alice não
      // interferem na disputa de água — é justamente o ponto do ranking por task.
      expect(agua.unit).toBe('LITERS');
      expect(agua.entries[0]).toMatchObject({ groupMemberId: 'b', rank: 1 });
      expect(agua.entries[0].score.toString()).toBe('9');

      expect(corrida.unit).toBe('KM');
      expect(corrida.entries[0]).toMatchObject({ groupMemberId: 'a', rank: 1 });
      expect(corrida.entries[0].score.toString()).toBe('20');

      expect(gym.kind).toBe('BOOLEAN');
      expect(gym.unit).toBeNull();
      expect(gym.entries[0].score.toString()).toBe('4');
    });
  });

  describe('cache', () => {
    it('retorna do cache quando presente, sem consultar o banco', async () => {
      cache.get.mockResolvedValue([{ challengeTaskId: 'x', entries: [] }]);

      const result = await service.getLeaderboard(challenge);

      expect(result).toEqual([{ challengeTaskId: 'x', entries: [] }]);
      expect(prisma.challengeTask.findMany).not.toHaveBeenCalled();
      expect(prisma.challengeCompletion.groupBy).not.toHaveBeenCalled();
      expect(prisma.challengeProgress.groupBy).not.toHaveBeenCalled();
    });

    it('grava no cache com TTL de 90s após calcular', async () => {
      cache.get.mockResolvedValue(undefined);

      await service.getLeaderboard(challenge);

      expect(cache.set).toHaveBeenCalledWith(
        'leaderboard:challenge-1',
        expect.any(Array),
        90_000,
      );
    });

    it('invalidate remove a chave do cache', async () => {
      await service.invalidate('challenge-1');
      expect(cache.del).toHaveBeenCalledWith('leaderboard:challenge-1');
    });
  });
});
