import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  clampToTarget,
  reachedTarget,
  validateQuantitativeShape,
} from './quantitative';

const d = (n: string | number) => new Prisma.Decimal(n);

describe('validateQuantitativeShape', () => {
  it('QUANTITATIVE exige targetValue e unit', () => {
    expect(() =>
      validateQuantitativeShape({ kind: 'QUANTITATIVE', unit: 'KM' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateQuantitativeShape({ kind: 'QUANTITATIVE', targetValue: 5 }),
    ).toThrow(BadRequestException);
  });

  it('QUANTITATIVE completa passa', () => {
    expect(() =>
      validateQuantitativeShape({
        kind: 'QUANTITATIVE',
        targetValue: 5,
        unit: 'KM',
      }),
    ).not.toThrow();
  });

  it('BOOLEAN (explícito ou omitido) rejeita campos quantitativos', () => {
    expect(() =>
      validateQuantitativeShape({ kind: 'BOOLEAN', targetValue: 5 }),
    ).toThrow(BadRequestException);
    expect(() => validateQuantitativeShape({ unit: 'KM' })).toThrow(
      BadRequestException,
    );
  });

  it('task booleana sem nenhum campo quantitativo passa', () => {
    expect(() => validateQuantitativeShape({})).not.toThrow();
    expect(() => validateQuantitativeShape({ kind: 'BOOLEAN' })).not.toThrow();
  });

  // targetValue: 0 seria um alvo inatingível-por-baixo (já nasce concluída).
  // O @IsPositive do DTO barra, mas a regra também vale aqui.
  it('trata targetValue 0 como ausente', () => {
    expect(() =>
      validateQuantitativeShape({
        kind: 'QUANTITATIVE',
        targetValue: 0,
        unit: 'KM',
      }),
    ).not.toThrow();
  });
});

// Exclusivo do lado pessoal — o lado de desafio não tem teto, para o ranking
// por SUM(value) não descartar o excedente (ver ChallengesService).
describe('clampToTarget', () => {
  it.each([
    ['abaixo do alvo passa intacto', '1.5', '2', '1.5'],
    ['acima do alvo vira o alvo', '5', '2', '2'],
    ['negativo vira zero', '-3', '2', '0'],
    ['exatamente o alvo passa intacto', '2', '2', '2'],
    ['zero passa intacto', '0', '2', '0'],
  ])('%s', (_label, value, target, expected) => {
    expect(clampToTarget(d(value), d(target)).toString()).toBe(expected);
  });
});

describe('reachedTarget', () => {
  it.each([
    ['abaixo', '1.99', '2', false],
    ['exato', '2', '2', true],
    ['acima', '2.01', '2', true],
    ['casas decimais', '1.50', '1.5', true],
  ])('%s', (_label, value, target, expected) => {
    expect(reachedTarget(d(value), d(target))).toBe(expected);
  });
});
