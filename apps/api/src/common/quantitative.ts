import { BadRequestException } from '@nestjs/common';
import { Prisma, type TaskKind, type UnitType } from '@prisma/client';

// Decimal(12,2) no schema -> 10 dígitos antes da vírgula.
export const MAX_TARGET_VALUE = 9_999_999_999;

export interface QuantitativeShape {
  kind?: TaskKind;
  targetValue?: number;
  unit?: UnitType;
}

// Regra combinacional kind <-> targetValue/unit. Vive aqui, e não nos DTOs,
// pelo mesmo motivo documentado em create-task.dto.ts: combinação entre
// campos fica ilegível em @ValidateIf. Compartilhada por Task e
// ChallengeTask para a regra não divergir entre pessoal e grupo.
export function validateQuantitativeShape(dto: QuantitativeShape): void {
  if (dto.kind === 'QUANTITATIVE') {
    if (dto.targetValue == null) {
      throw new BadRequestException(
        'targetValue é obrigatório em tasks quantitativas',
      );
    }
    if (dto.unit == null) {
      throw new BadRequestException(
        'unit é obrigatório em tasks quantitativas',
      );
    }
    return;
  }

  if (dto.targetValue !== undefined || dto.unit !== undefined) {
    throw new BadRequestException(
      'Campos quantitativos exigem kind=QUANTITATIVE',
    );
  }
}

// Só o lado PESSOAL usa isto. Lá o alvo é uma meta pessoal: acumular além
// dela não significa nada e deixaria a barra da UI passar de 100%.
//
// O lado de DESAFIO deliberadamente não tem teto — o leaderboard rankeia uma
// ChallengeTask quantitativa por SUM(value), então limitar no alvo empataria
// todo mundo que bate a meta e jogaria fora justamente o excedente que decide
// "quem bebeu mais". Lá o piso também é desnecessário: o DTO só aceita
// delta > 0, então o valor parte de 0 e é monotônico.
export function clampToTarget(
  value: Prisma.Decimal,
  targetValue: Prisma.Decimal,
): Prisma.Decimal {
  if (value.lessThan(0)) return new Prisma.Decimal(0);
  if (value.greaterThan(targetValue)) return targetValue;
  return value;
}

export function reachedTarget(
  value: Prisma.Decimal,
  targetValue: Prisma.Decimal,
): boolean {
  return value.greaterThanOrEqualTo(targetValue);
}
