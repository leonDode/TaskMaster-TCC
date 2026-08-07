import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AVATAR_STORAGE } from './avatar-storage.interface';
import { SupabaseAvatarStorage } from './supabase-avatar-storage';

// Espelha auth/auth.module.ts (TOKEN_VERIFIER): a criação do client real
// (com a service role key, que ignora RLS) fica isolada aqui — o resto do
// app só conhece a interface AvatarStorage.
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AVATAR_STORAGE,
      useFactory: (config: ConfigService) =>
        new SupabaseAvatarStorage(
          createClient(
            config.getOrThrow<string>('SUPABASE_URL'),
            config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
          ),
        ),
      inject: [ConfigService],
    },
  ],
  exports: [AVATAR_STORAGE],
})
export class StorageModule {}
