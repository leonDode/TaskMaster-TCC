import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { ChallengesModule } from './challenges/challenges.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ThrottlerBehindProxyGuard } from './common/throttler-behind-proxy.guard';
import { GroupsModule } from './groups/groups.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req) => {
          const existing = req.headers['x-request-id'];
          return typeof existing === 'string' ? existing : randomUUID();
        },
        // Nunca loga o token/cookie de sessão. autoLogging já cobre rota,
        // status e duração por request; não logamos corpo de requisições
        // (pino-http não inclui body a menos que configurado, e não
        // configuramos).
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          remove: true,
        },
        customProps: (req) => ({
          userId: (req as { user?: { id?: string } }).user?.id,
        }),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    // Store padrão em memória — ok para 1 instância Render (ver Riscos no
    // plano: não escala para >1 instância sem migrar para Redis).
    CacheModule.register({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 5 },
      { name: 'medium', ttl: 60_000, limit: 60 },
      { name: 'long', ttl: 900_000, limit: 300 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    TasksModule,
    GroupsModule,
    ChallengesModule,
    HealthModule,
  ],
  providers: [
    // Ordem importa e é definida pela posição no array (NestJS executa
    // múltiplos APP_GUARD na ordem em que aparecem aqui): JwtAuthGuard
    // precisa rodar antes, populando req.user a tempo do tracker por
    // usuário do ThrottlerBehindProxyGuard. Registrar as duas em módulos
    // diferentes (como estava antes) NÃO garante essa ordem — foi assim
    // que descobrimos, na prática, que o rate limit estava caindo sempre
    // no fallback de IP.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
