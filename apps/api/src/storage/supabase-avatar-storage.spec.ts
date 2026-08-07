import { SupabaseAvatarStorage } from './supabase-avatar-storage';

function createSupabaseClientMock() {
  const bucket = {
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
    remove: jest.fn(),
  };
  return {
    client: { storage: { from: jest.fn().mockReturnValue(bucket) } },
    bucket,
  };
}

describe('SupabaseAvatarStorage', () => {
  describe('upload', () => {
    it('faz upload no path {userId}/avatar.{ext} com upsert e content-type corretos', async () => {
      const { client, bucket } = createSupabaseClientMock();
      bucket.upload.mockResolvedValue({
        data: { path: 'user-1/avatar.jpg' },
        error: null,
      });
      bucket.getPublicUrl.mockReturnValue({
        data: {
          publicUrl:
            'https://supabase.example/storage/v1/object/public/avatars/user-1/avatar.jpg',
        },
      });
      const storage = new SupabaseAvatarStorage(client as never);

      const buffer = Buffer.from('fake-image-bytes');
      await storage.upload({
        userId: 'user-1',
        ext: 'jpg',
        buffer,
        contentType: 'image/jpeg',
      });

      expect(client.storage.from).toHaveBeenCalledWith('avatars');
      expect(bucket.upload).toHaveBeenCalledWith('user-1/avatar.jpg', buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    });

    it('retorna a publicUrl vinda de getPublicUrl', async () => {
      const { client, bucket } = createSupabaseClientMock();
      bucket.upload.mockResolvedValue({
        data: { path: 'user-1/avatar.png' },
        error: null,
      });
      bucket.getPublicUrl.mockReturnValue({
        data: {
          publicUrl:
            'https://supabase.example/storage/v1/object/public/avatars/user-1/avatar.png',
        },
      });
      const storage = new SupabaseAvatarStorage(client as never);

      const result = await storage.upload({
        userId: 'user-1',
        ext: 'png',
        buffer: Buffer.from('x'),
        contentType: 'image/png',
      });

      expect(bucket.getPublicUrl).toHaveBeenCalledWith('user-1/avatar.png');
      expect(result).toEqual({
        publicUrl:
          'https://supabase.example/storage/v1/object/public/avatars/user-1/avatar.png',
      });
    });

    // supabase-js v2 retorna {data, error} em vez de lançar — se a
    // implementação só checar `data`, um upload falho passaria como
    // sucesso. Este teste existe especificamente pra pegar essa classe de bug.
    it('lança quando o Storage retorna error, mesmo sem exception nativa', async () => {
      const { client, bucket } = createSupabaseClientMock();
      bucket.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage bucket not found' },
      });
      const storage = new SupabaseAvatarStorage(client as never);

      await expect(
        storage.upload({
          userId: 'user-1',
          ext: 'jpg',
          buffer: Buffer.from('x'),
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow('Storage bucket not found');
      expect(bucket.getPublicUrl).not.toHaveBeenCalled();
    });
  });

  describe('removeOtherExtensions', () => {
    it('remove os paths das outras extensões, mantendo a atual', async () => {
      const { client, bucket } = createSupabaseClientMock();
      bucket.remove.mockResolvedValue({ data: [], error: null });
      const storage = new SupabaseAvatarStorage(client as never);

      await storage.removeOtherExtensions('user-1', 'webp');

      expect(bucket.remove).toHaveBeenCalledWith([
        'user-1/avatar.jpg',
        'user-1/avatar.png',
      ]);
    });

    it('nunca lança, mesmo se o Storage retornar error (limpeza é best-effort)', async () => {
      const { client, bucket } = createSupabaseClientMock();
      bucket.remove.mockResolvedValue({
        data: null,
        error: { message: 'boom' },
      });
      const storage = new SupabaseAvatarStorage(client as never);

      await expect(
        storage.removeOtherExtensions('user-1', 'jpg'),
      ).resolves.toBeUndefined();
    });

    it('nunca lança mesmo se a chamada em si rejeitar', async () => {
      const { client, bucket } = createSupabaseClientMock();
      bucket.remove.mockRejectedValue(new Error('network down'));
      const storage = new SupabaseAvatarStorage(client as never);

      await expect(
        storage.removeOtherExtensions('user-1', 'jpg'),
      ).resolves.toBeUndefined();
    });
  });
});
