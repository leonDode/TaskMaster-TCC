import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// O CLI (migrate/db push/seed) precisa de uma conexão de sessão estável
// (DDL + advisory locks) — por isso usa DIRECT_URL (session pooler ou
// conexão direta do Supabase), nunca o transaction pooler. O runtime da
// aplicação (PrismaService) usa DATABASE_URL (transaction pooler) via
// driver adapter — ver src/prisma/prisma.service.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
