import { randomInt } from 'node:crypto';

// Não usa `nanoid`: a partir da v5 é ESM-only, quebra em projeto CommonJS
// via `require`. Alfabeto sem caracteres ambíguos (sem 0/O/1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
