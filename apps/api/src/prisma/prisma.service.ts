import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Prisma 7 exige um driver adapter no runtime (não lê mais `url` do
// schema.prisma). DATABASE_URL aqui é o transaction pooler do Supabase
// (porta 6543, pgbouncer=true) — diferente da URL usada por `prisma migrate`
// (DIRECT_URL, configurada em prisma.config.ts), que precisa de sessão
// estável e nunca é usada em runtime.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado ao Postgres via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
