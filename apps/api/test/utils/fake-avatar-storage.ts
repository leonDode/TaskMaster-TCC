import type {
  AvatarStorage,
  AvatarUploadParams,
} from '../../src/storage/avatar-storage.interface';

// Substitui SupabaseAvatarStorage nos testes e2e (via
// overrideProvider(AVATAR_STORAGE)) — evita depender de um bucket Supabase
// real só pra subir a aplicação. O comportamento de Storage em si já é
// coberto pelos testes unitários (supabase-avatar-storage.spec.ts).
export class FakeAvatarStorage implements AvatarStorage {
  async upload({
    userId,
    ext,
  }: AvatarUploadParams): Promise<{ publicUrl: string }> {
    return {
      publicUrl: `https://fake-storage.test/avatars/${userId}/avatar.${ext}`,
    };
  }

  async removeOtherExtensions(): Promise<void> {}
}
