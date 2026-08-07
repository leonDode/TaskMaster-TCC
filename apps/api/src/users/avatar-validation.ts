import { BadRequestException } from '@nestjs/common';

// Limite de negócio (2MB) — separado do backstop do multer no controller,
// que é só uma guarda de memória bem mais folgada. Este é o que de fato
// vira 400 pro client.
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export type AvatarImageFormat = 'jpeg' | 'png' | 'webp';

export interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const SIGNATURES: Array<{
  format: AvatarImageFormat;
  matches: (buf: Buffer) => boolean;
}> = [
  {
    format: 'jpeg',
    matches: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    format: 'png',
    matches: (buf) =>
      buf.length >= 8 &&
      buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    format: 'webp',
    matches: (buf) =>
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

const CONTENT_TYPE_BY_FORMAT: Record<AvatarImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXT_BY_FORMAT: Record<AvatarImageFormat, 'jpg' | 'png' | 'webp'> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

// Detecção por conteúdo real (magic bytes), nunca por mimetype/extensão
// declarados pelo client — só assim a validação não pode ser burlada
// renomeando/mentindo o Content-Type de um arquivo.
export function detectImageFormat(buffer: Buffer): AvatarImageFormat | null {
  const signature = SIGNATURES.find(({ matches }) => matches(buffer));
  return signature?.format ?? null;
}

export function validateAvatarFile(file: { buffer: Buffer; size: number }): {
  ext: 'jpg' | 'png' | 'webp';
  contentType: string;
} {
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new BadRequestException(
      `Arquivo excede o limite de ${MAX_AVATAR_SIZE_BYTES / (1024 * 1024)}MB`,
    );
  }

  const format = detectImageFormat(file.buffer);
  if (!format) {
    throw new BadRequestException(
      'Formato de arquivo inválido — apenas JPEG, PNG ou WEBP são aceitos',
    );
  }

  return {
    ext: EXT_BY_FORMAT[format],
    contentType: CONTENT_TYPE_BY_FORMAT[format],
  };
}
