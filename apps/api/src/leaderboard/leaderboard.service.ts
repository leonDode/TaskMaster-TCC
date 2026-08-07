import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import {
  Prisma,
  type Challenge,
  type TaskKind,
  type UnitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LeaderboardEntry {
  groupMemberId: string;
  displayName: string | null;
  avatarUrl: string | null;
  // BOOLEAN: contagem de conclusões no período. QUANTITATIVE: soma acumulada
  // do progresso. Decimal nos dois casos para o ranking ter um caminho de
  // código só; serializa como string no JSON ("5", "9.5").
  score: Prisma.Decimal;
  rank: number;
}

// Um ranking por ChallengeTask, não um agregado do desafio inteiro: somar
// grandezas diferentes não faz sentido — nem entre BOOLEAN e QUANTITATIVE,
// nem entre duas quantitativas com unidades diferentes (km e litros). E a
// pergunta real do produto é sempre sobre uma task ("quem bebeu mais água").
export interface TaskLeaderboard {
  challengeTaskId: string;
  title: string;
  kind: TaskKind;
  unit: UnitType | null;
  targetValue: Prisma.Decimal | null;
  entries: LeaderboardEntry[];
}

interface MemberRow {
  id: string;
  user: { displayName: string | null; avatarUrl: string | null };
}

// TTL 90s — meio da faixa "60-120s" pedida (leaderboard "quase real-time",
// sem WebSocket). Invalidação ativa (ver `invalidate`) faz a própria ação
// do usuário aparecer instantânea para ele; o TTL só limita a demora para
// os outros verem. Cache em memória: ok para 1 instância Render; não
// escala para >1 instância — não resolvido agora, ver Riscos no plano.
const LEADERBOARD_TTL_MS = 90_000;

const ZERO = new Prisma.Decimal(0);

// Ranking "competition ranking": empate = mesmo rank, próximo pula
// (1, 2, 2, 4) — não (1, 2, 2, 3). Mesma regra para os dois tipos de task;
// muda só a origem do score, por isso vive aqui e não duplicada.
function rankEntries(
  members: MemberRow[],
  scoreByMemberId: Map<string, Prisma.Decimal>,
): LeaderboardEntry[] {
  const sorted = members
    .map((member) => ({
      groupMemberId: member.id,
      displayName: member.user.displayName,
      avatarUrl: member.user.avatarUrl,
      // Membro sem nenhuma atividade entra com 0 e compartilha o último rank,
      // em vez de sumir do placar.
      score: scoreByMemberId.get(member.id) ?? ZERO,
    }))
    .sort((a, b) => b.score.comparedTo(a.score));

  const entries: LeaderboardEntry[] = [];
  let previousScore: Prisma.Decimal | null = null;
  let previousRank = 0;
  sorted.forEach((entry, index) => {
    const rank =
      previousScore !== null && entry.score.equals(previousScore)
        ? previousRank
        : index + 1;
    entries.push({ ...entry, rank });
    previousScore = entry.score;
    previousRank = rank;
  });
  return entries;
}

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private cacheKey(challengeId: string): string {
    return `leaderboard:${challengeId}`;
  }

  async getLeaderboard(challenge: Challenge): Promise<TaskLeaderboard[]> {
    const cached = await this.cache.get<TaskLeaderboard[]>(
      this.cacheKey(challenge.id),
    );
    if (cached) {
      return cached;
    }

    const [tasks, members] = await Promise.all([
      this.prisma.challengeTask.findMany({
        where: { challengeId: challenge.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.groupMember.findMany({
        where: { groupId: challenge.groupId },
        include: { user: { select: { displayName: true, avatarUrl: true } } },
      }),
    ]);

    const booleanTaskIds = tasks
      .filter((task) => task.kind === 'BOOLEAN')
      .map((task) => task.id);
    const quantitativeTaskIds = tasks
      .filter((task) => task.kind === 'QUANTITATIVE')
      .map((task) => task.id);

    // Duas agregações em vez de uma com CASE: os dados vêm de tabelas
    // diferentes (um CASE não evitaria o segundo acesso, só o esconderia num
    // UNION), o Prisma não expressa agregação condicional sem $queryRaw — que
    // não existe em nenhum service deste repo — e o resultado inteiro é
    // cacheado 90s, então o round-trip extra é amortizado entre os pollers.
    // challengeId denormalizado nas duas tabelas evita join com
    // challenge_tasks aqui (caminho quente).
    const [counts, sums] = await Promise.all([
      booleanTaskIds.length
        ? this.prisma.challengeCompletion.groupBy({
            by: ['challengeTaskId', 'groupMemberId'],
            where: {
              challengeId: challenge.id,
              challengeTaskId: { in: booleanTaskIds },
            },
            _count: { _all: true },
          })
        : [],
      quantitativeTaskIds.length
        ? this.prisma.challengeProgress.groupBy({
            by: ['challengeTaskId', 'groupMemberId'],
            where: {
              challengeId: challenge.id,
              challengeTaskId: { in: quantitativeTaskIds },
            },
            _sum: { value: true },
          })
        : [],
    ]);

    const scoresByTask = new Map<string, Map<string, Prisma.Decimal>>();
    for (const row of counts) {
      const byMember = scoresByTask.get(row.challengeTaskId) ?? new Map();
      byMember.set(row.groupMemberId, new Prisma.Decimal(row._count._all));
      scoresByTask.set(row.challengeTaskId, byMember);
    }
    for (const row of sums) {
      const byMember = scoresByTask.get(row.challengeTaskId) ?? new Map();
      byMember.set(row.groupMemberId, row._sum.value ?? ZERO);
      scoresByTask.set(row.challengeTaskId, byMember);
    }

    const leaderboards: TaskLeaderboard[] = tasks.map((task) => ({
      challengeTaskId: task.id,
      title: task.title,
      kind: task.kind,
      unit: task.unit,
      targetValue: task.targetValue,
      entries: rankEntries(members, scoresByTask.get(task.id) ?? new Map()),
    }));

    await this.cache.set(
      this.cacheKey(challenge.id),
      leaderboards,
      LEADERBOARD_TTL_MS,
    );
    return leaderboards;
  }

  async invalidate(challengeId: string): Promise<void> {
    await this.cache.del(this.cacheKey(challengeId));
  }
}
