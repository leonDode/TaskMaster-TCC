# @task-master/web

Frontend do task-master: React + Vite + TypeScript + Tailwind CSS + shadcn/ui, consumindo a API em `apps/api`. Autenticação via Supabase Auth (email/senha, Google OAuth e recuperação de senha); a API nunca emite tokens, apenas valida o JWT do Supabase.

## Setup (uma vez)

1. Instale as dependências do monorepo na raiz: `pnpm install`.
2. Build de `packages/shared` (não tem watch automático, repita sempre que `packages/shared/src/recurrence.ts` mudar):
   ```
   pnpm --filter @task-master/shared build
   ```
3. Copie `.env.example` para `.env.local` e preencha:
   ```
   cp apps/web/.env.example apps/web/.env.local
   ```
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: mesmo projeto Supabase usado por `apps/api` (chave **anon public**, nunca a `service_role`).
   - `VITE_API_BASE_URL`: URL da API (`http://localhost:3000` em dev).
4. No painel do Supabase (Authentication → URL Configuration), adicione `http://localhost:5173/auth/callback` e `http://localhost:5173/reset-password` em Redirect URLs, e habilite o provedor Google em Authentication → Providers se for testar o login social.
5. Em `apps/api/.env`, garanta que `CORS_ORIGINS` inclui `http://localhost:5173`.

## Rodando localmente

Com a API já rodando (`pnpm --filter @task-master/api start:dev`, porta 3000):

```
pnpm --filter @task-master/web dev
```

Abre em `http://localhost:5173`.

## Outros comandos

```
pnpm --filter @task-master/web typecheck   # tsc -b --noEmit
pnpm --filter @task-master/web build       # tsc -b && vite build
pnpm --filter @task-master/web test        # vitest run
pnpm --filter @task-master/web preview     # servir o build de produção
```
