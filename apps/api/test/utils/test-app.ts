import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TOKEN_VERIFIER } from '../../src/auth/token-verifier.interface';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AVATAR_STORAGE } from '../../src/storage/avatar-storage.interface';
import { FakeAvatarStorage } from './fake-avatar-storage';
import { FakeTokenVerifier } from './fake-token-verifier';

export interface TestUser {
  id: string;
  email: string;
  authHeader: string;
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  createUser: (emailPrefix: string) => TestUser;
}

let tokenCounter = 0;

export async function createTestApp(): Promise<TestContext> {
  const verifier = new FakeTokenVerifier();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verifier)
    .overrideProvider(AVATAR_STORAGE)
    .useValue(new FakeAvatarStorage())
    .compile();

  const app = moduleRef.createNestApplication();
  // Mesma config de main.ts — sem Helmet/CORS/pino aqui (irrelevantes para
  // o comportamento da API em si e só adicionariam ruído aos testes).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);

  const createUser = (emailPrefix: string): TestUser => {
    const token = `test-token-${++tokenCounter}`;
    const id = randomUUID();
    const email = `${emailPrefix}-${tokenCounter}@example.com`;
    verifier.register(token, { sub: id, email });
    return { id, email, authHeader: `Bearer ${token}` };
  };

  return { app, prisma, createUser };
}
