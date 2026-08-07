import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AvatarStorage,
  AvatarUploadParams,
} from './avatar-storage.interface';

const BUCKET = 'avatars';
const EXTS = ['jpg', 'png', 'webp'] as const;

export class SupabaseAvatarStorage implements AvatarStorage {
  // Client já construído injetado via construtor (nunca criado aqui) —
  // é o que permite mockar em teste sem subir um client real. A criação
  // real (createClient com a service role key) vive só em storage.module.ts.
  constructor(private readonly client: SupabaseClient) {}

  async upload({
    userId,
    ext,
    buffer,
    contentType,
  }: AvatarUploadParams): Promise<{ publicUrl: string }> {
    const path = `${userId}/avatar.${ext}`;
    const bucket = this.client.storage.from(BUCKET);

    // supabase-js v2 nunca lança em erro de Storage, só retorna
    // {data: null, error}. Checar error explicitamente é obrigatório —
    // senão um upload falho vira sucesso silencioso.
    const { error } = await bucket.upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      throw new Error(error.message);
    }

    const {
      data: { publicUrl },
    } = bucket.getPublicUrl(path);
    return { publicUrl };
  }

  async removeOtherExtensions(
    userId: string,
    keepExt: 'jpg' | 'png' | 'webp',
  ): Promise<void> {
    const paths = EXTS.filter((ext) => ext !== keepExt).map(
      (ext) => `${userId}/avatar.${ext}`,
    );
    try {
      await this.client.storage.from(BUCKET).remove(paths);
    } catch {
      // Best-effort — objeto órfão esquecido é aceitável, falhar a
      // request principal por causa da limpeza não é.
    }
  }
}
