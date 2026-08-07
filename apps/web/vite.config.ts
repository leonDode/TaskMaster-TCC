/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // `@task-master/shared` is a workspace-linked package built to CommonJS
    // (it's also consumed by the NestJS API) — Vite's dependency scanner
    // skips symlinked packages by default, so without this it's served
    // as-is and the browser chokes on its CJS `exports.x = ...` shape.
    // Including it here forces esbuild to pre-bundle it into ESM.
    include: ['@task-master/shared'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // `src/lib/env.ts` throws at import time on a missing variable, and the
    // Supabase client it feeds is pulled in transitively by any spec that
    // touches the auth store. Locally `.env.local` covers that, but it's
    // gitignored — so CI needs these fakes to get past module evaluation.
    // Every network call is mocked; nothing here reaches a real service.
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_API_BASE_URL: 'http://localhost:3000',
    },
    // `@testing-library/react`'s automatic post-test `cleanup()` only
    // registers itself when it can see a global `afterEach` — without this,
    // dialogs from one test stay mounted into the next.
    globals: true,
  },
});
