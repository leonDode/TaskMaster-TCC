import { BadRequestException } from '@nestjs/common';
import {
  MAX_AVATAR_SIZE_BYTES,
  detectImageFormat,
  validateAvatarFile,
} from './avatar-validation';

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x00, 0x00]);
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const WEBP_HEADER = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);

function fileOf(buffer: Buffer, size = buffer.length) {
  return { buffer, size };
}

describe('detectImageFormat', () => {
  it('reconhece JPEG pela assinatura FF D8 FF', () => {
    expect(detectImageFormat(JPEG_HEADER)).toBe('jpeg');
  });

  it('reconhece PNG pela assinatura de 8 bytes', () => {
    expect(detectImageFormat(PNG_HEADER)).toBe('png');
  });

  it('reconhece WEBP por RIFF....WEBP', () => {
    expect(detectImageFormat(WEBP_HEADER)).toBe('webp');
  });

  it('retorna null pra assinatura desconhecida (ex: PDF)', () => {
    const pdfHeader = Buffer.from('%PDF-1.4', 'ascii');
    expect(detectImageFormat(pdfHeader)).toBeNull();
  });

  it('retorna null pra buffer vazio', () => {
    expect(detectImageFormat(Buffer.alloc(0))).toBeNull();
  });

  it('retorna null pra buffer truncado (menor que a assinatura mais longa)', () => {
    expect(detectImageFormat(Buffer.from([0x89, 0x50, 0x4e]))).toBeNull();
  });
});

describe('validateAvatarFile', () => {
  it('aceita JPEG válido dentro do limite de tamanho', () => {
    expect(validateAvatarFile(fileOf(JPEG_HEADER))).toEqual({
      ext: 'jpg',
      contentType: 'image/jpeg',
    });
  });

  it('aceita PNG válido', () => {
    expect(validateAvatarFile(fileOf(PNG_HEADER))).toEqual({
      ext: 'png',
      contentType: 'image/png',
    });
  });

  it('aceita WEBP válido', () => {
    expect(validateAvatarFile(fileOf(WEBP_HEADER))).toEqual({
      ext: 'webp',
      contentType: 'image/webp',
    });
  });

  // Validação é por conteúdo real, nunca por mimetype/nome de arquivo
  // declarado pelo client — um client malicioso pode mentir os dois.
  it('detecta pelo conteúdo real mesmo se o nome/mimetype declarado mentir', () => {
    const fakeJpgNamedFile = fileOf(PNG_HEADER);
    expect(validateAvatarFile(fakeJpgNamedFile)).toEqual({
      ext: 'png',
      contentType: 'image/png',
    });
  });

  it('rejeita assinatura desconhecida', () => {
    expect(() =>
      validateAvatarFile(fileOf(Buffer.from('%PDF-1.4', 'ascii'))),
    ).toThrow(BadRequestException);
  });

  it('rejeita buffer vazio', () => {
    expect(() => validateAvatarFile(fileOf(Buffer.alloc(0)))).toThrow(
      BadRequestException,
    );
  });

  it('rejeita buffer truncado', () => {
    expect(() =>
      validateAvatarFile(fileOf(Buffer.from([0x89, 0x50, 0x4e]))),
    ).toThrow(BadRequestException);
  });

  it('aceita arquivo exatamente no limite de 2MB', () => {
    const size = MAX_AVATAR_SIZE_BYTES;
    expect(validateAvatarFile(fileOf(JPEG_HEADER, size))).toEqual({
      ext: 'jpg',
      contentType: 'image/jpeg',
    });
  });

  it('rejeita arquivo um byte acima do limite de 2MB', () => {
    const size = MAX_AVATAR_SIZE_BYTES + 1;
    expect(() => validateAvatarFile(fileOf(JPEG_HEADER, size))).toThrow(
      BadRequestException,
    );
  });

  it('checa tamanho antes de escanear a assinatura (arquivo grande e inválido ainda rejeita por tamanho)', () => {
    const size = MAX_AVATAR_SIZE_BYTES + 1;
    expect(() =>
      validateAvatarFile(fileOf(Buffer.from('garbage'), size)),
    ).toThrow(BadRequestException);
  });
});
