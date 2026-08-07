import type { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, TestUser } from './utils/test-app';

// Requer Postgres alcançável via DATABASE_URL/DIRECT_URL (ver
// docker-compose.yml na raiz: `docker compose up -d postgres` +
// `prisma migrate deploy` antes de rodar).
describe('Autorização e regras de negócio (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let createUser: (emailPrefix: string) => TestUser;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    http = app.getHttpServer();
    createUser = ctx.createUser;
  });

  afterAll(async () => {
    await app.close();
  });

  // O ThrottlerGuard conta requisições por IP; como todos os testes batem
  // do mesmo processo (127.0.0.1) e rodam bem mais rápido que a janela
  // real de 1s, o contador de um teste vaza pro próximo e gera 429
  // inesperado. onApplicationShutdown() cancela os setTimeout pendentes
  // de expiração — sem isso, um clear() direto do Map deixa timers órfãos
  // que tentam ler uma chave já removida e derrubam o processo depois.
  beforeEach(() => {
    const storage = app.get(ThrottlerStorage) as ThrottlerStorageService;
    storage.onApplicationShutdown();
    storage.storage.clear();
  });

  describe('Isolamento de Tasks entre usuários', () => {
    it('usuário B não consegue ver, editar ou apagar uma task de A (404)', async () => {
      const alice = createUser('alice');
      const bob = createUser('bob');

      const created = await request(http)
        .post('/tasks')
        .set('Authorization', alice.authHeader)
        .send({ title: 'Task da Alice' })
        .expect(201);
      const taskId = created.body.id;

      await request(http)
        .get(`/tasks/${taskId}`)
        .set('Authorization', bob.authHeader)
        .expect(404);

      await request(http)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', bob.authHeader)
        .send({ title: 'Hackeado' })
        .expect(404);

      await request(http)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', bob.authHeader)
        .expect(404);

      // A continua vendo normalmente
      await request(http)
        .get(`/tasks/${taskId}`)
        .set('Authorization', alice.authHeader)
        .expect(200);
    });
  });

  describe('Grupos: membership e papéis', () => {
    it('não-membro recebe 404 ao acessar o grupo', async () => {
      const alice = createUser('alice');
      const bob = createUser('bob');

      const group = await request(http)
        .post('/groups')
        .set('Authorization', alice.authHeader)
        .send({ name: 'Grupo da Alice' })
        .expect(201);

      await request(http)
        .get(`/groups/${group.body.id}`)
        .set('Authorization', bob.authHeader)
        .expect(404);
    });

    it('join com código de convite errado -> 404', async () => {
      const bob = createUser('bob');
      await request(http)
        .post('/groups/join')
        .set('Authorization', bob.authHeader)
        .send({ inviteCode: 'ZZZZZZZZ' })
        .expect(404);
    });

    it('join duplicado no mesmo grupo -> 409', async () => {
      const alice = createUser('alice');
      const bob = createUser('bob');

      const group = await request(http)
        .post('/groups')
        .set('Authorization', alice.authHeader)
        .send({ name: 'Grupo X' })
        .expect(201);
      const inviteCode = group.body.inviteCode;

      await request(http)
        .post('/groups/join')
        .set('Authorization', bob.authHeader)
        .send({ inviteCode })
        .expect(201);

      await request(http)
        .post('/groups/join')
        .set('Authorization', bob.authHeader)
        .send({ inviteCode })
        .expect(409);
    });

    it('member comum não pode PATCH/DELETE o grupo (403); OWNER pode', async () => {
      const alice = createUser('alice');
      const bob = createUser('bob');

      const group = await request(http)
        .post('/groups')
        .set('Authorization', alice.authHeader)
        .send({ name: 'Grupo Y' })
        .expect(201);

      await request(http)
        .post('/groups/join')
        .set('Authorization', bob.authHeader)
        .send({ inviteCode: group.body.inviteCode })
        .expect(201);

      await request(http)
        .patch(`/groups/${group.body.id}`)
        .set('Authorization', bob.authHeader)
        .send({ name: 'Bob tentando renomear' })
        .expect(403);

      await request(http)
        .patch(`/groups/${group.body.id}`)
        .set('Authorization', alice.authHeader)
        .send({ name: 'Novo nome (Alice, OWNER)' })
        .expect(200);
    });
  });

  describe('Challenges: janela de tempo e duplicidade de conclusão', () => {
    async function setupGroupWithChallenge(opts: {
      startAt: Date;
      endAt: Date;
    }) {
      const alice = createUser('alice');
      const bob = createUser('bob');

      const group = await request(http)
        .post('/groups')
        .set('Authorization', alice.authHeader)
        .send({ name: 'Grupo Desafio' })
        .expect(201);

      await request(http)
        .post('/groups/join')
        .set('Authorization', bob.authHeader)
        .send({ inviteCode: group.body.inviteCode })
        .expect(201);

      const challenge = await request(http)
        .post(`/groups/${group.body.id}/challenges`)
        .set('Authorization', alice.authHeader)
        .send({
          title: 'Desafio de teste',
          startAt: opts.startAt.toISOString(),
          endAt: opts.endAt.toISOString(),
          tasks: [{ title: 'Correr 5km' }],
        })
        .expect(201);

      const withTasks = await request(http)
        .get(`/groups/${group.body.id}/challenges/${challenge.body.id}`)
        .set('Authorization', alice.authHeader)
        .expect(200);

      return {
        alice,
        bob,
        groupId: group.body.id as string,
        challengeId: challenge.body.id as string,
        taskId: withTasks.body.tasks[0].id as string,
      };
    }

    it('completar fora da janela do desafio -> 400', async () => {
      const past = new Date(Date.now() - 7 * 86_400_000);
      const { bob, groupId, challengeId, taskId } =
        await setupGroupWithChallenge({
          startAt: new Date(past.getTime() - 86_400_000),
          endAt: past,
        });

      await request(http)
        .post(
          `/groups/${groupId}/challenges/${challengeId}/tasks/${taskId}/complete`,
        )
        .set('Authorization', bob.authHeader)
        .expect(400);
    });

    it('completar dentro da janela funciona; repetir no mesmo dia -> 409', async () => {
      const { bob, groupId, challengeId, taskId } =
        await setupGroupWithChallenge({
          startAt: new Date(Date.now() - 3_600_000),
          endAt: new Date(Date.now() + 3_600_000),
        });

      await request(http)
        .post(
          `/groups/${groupId}/challenges/${challengeId}/tasks/${taskId}/complete`,
        )
        .set('Authorization', bob.authHeader)
        .expect(204);

      await request(http)
        .post(
          `/groups/${groupId}/challenges/${challengeId}/tasks/${taskId}/complete`,
        )
        .set('Authorization', bob.authHeader)
        .expect(409);
    });

    it('leaderboard: empate mantém o mesmo rank para ambos os membros', async () => {
      const { alice, bob, groupId, challengeId, taskId } =
        await setupGroupWithChallenge({
          startAt: new Date(Date.now() - 3_600_000),
          endAt: new Date(Date.now() + 3_600_000),
        });

      await request(http)
        .post(
          `/groups/${groupId}/challenges/${challengeId}/tasks/${taskId}/complete`,
        )
        .set('Authorization', bob.authHeader)
        .expect(204);
      await request(http)
        .post(
          `/groups/${groupId}/challenges/${challengeId}/tasks/${taskId}/complete`,
        )
        .set('Authorization', alice.authHeader)
        .expect(204);

      const leaderboard = await request(http)
        .get(`/groups/${groupId}/challenges/${challengeId}/leaderboard`)
        .set('Authorization', alice.authHeader)
        .expect(200);

      expect(leaderboard.body).toHaveLength(1);
      const [taskLeaderboard] = leaderboard.body;
      expect(taskLeaderboard.entries).toHaveLength(2);
      expect(
        taskLeaderboard.entries.every(
          (entry: { rank: number }) => entry.rank === 1,
        ),
      ).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('estoura o bucket "short" (5 requisições/1s) e responde 429', async () => {
      const bucketBreaker = createUser('bucket-breaker');
      const results: number[] = [];
      for (let i = 0; i < 7; i++) {
        const res = await request(http)
          .get('/users/me')
          .set('Authorization', bucketBreaker.authHeader);
        results.push(res.status);
      }
      expect(results).toContain(429);
    });
  });

  describe('Exception filter: erro não mapeado não vaza detalhes em produção', () => {
    it('responde mensagem genérica quando NODE_ENV=production', async () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const alice = createUser('alice');
        // UUID malformado: não bate com nenhum handler específico de erro
        // Prisma (P2002/P2025) — cai no catch-all genérico.
        const res = await request(http)
          .get('/tasks/not-a-valid-uuid')
          .set('Authorization', alice.authHeader);

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.message).not.toMatch(/prisma|stack|at .*\(/i);
      } finally {
        process.env.NODE_ENV = original;
      }
    });
  });
});
