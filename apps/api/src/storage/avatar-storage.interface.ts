export interface AvatarUploadParams {
  userId: string;
  ext: 'jpg' | 'png' | 'webp';
  buffer: Buffer;
  contentType: string;
}

// Único ponto de contato entre UsersService e "como/onde o avatar é
// guardado" — mesmo padrão de TOKEN_VERIFIER em auth/token-verifier.interface.ts.
export interface AvatarStorage {
  // Deve lançar em qualquer falha (nunca retornar sucesso parcial) — quem
  // chama depende disso pra decidir se atualiza o User no banco.
  upload(params: AvatarUploadParams): Promise<{ publicUrl: string }>;

  // Best-effort: limpa extensões antigas do mesmo usuário (ex: usuário
  // trocou de PNG pra WEBP entre uploads) pra não deixar objeto órfão no
  // bucket. Implementações não devem lançar — falha de limpeza nunca pode
  // derrubar a request principal.
  removeOtherExtensions(
    userId: string,
    keepExt: 'jpg' | 'png' | 'webp',
  ): Promise<void>;
}

export const AVATAR_STORAGE = Symbol('AVATAR_STORAGE');
