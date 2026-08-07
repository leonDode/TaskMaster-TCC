import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { MAX_TARGET_VALUE } from '../../common/quantitative';

// Exclusivo do lado PESSOAL. O lado de desafio usa IncrementProgressDto, que
// só aceita delta positivo — lá desfazer progresso é vetor de manipulação de
// ranking (ver README, "Contrato dos endpoints de progresso").
//
// `delta` XOR `value` — exatamente um dos dois. A checagem do XOR fica no
// service (mesma convenção de "avulsa XOR recorrente"), aqui só a forma.
//
// `delta` é o incremento atômico ("+1 copo"), aplicado via increment do
// Prisma para não perder atualização em toques concorrentes. `value` define
// o absoluto — idempotente em retry, e serve de correção e de reset
// (value: 0), o que é legítimo aqui porque o impacto é restrito ao próprio
// usuário.
export class UpsertProgressDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-MAX_TARGET_VALUE)
  @Max(MAX_TARGET_VALUE)
  delta?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_TARGET_VALUE)
  value?: number;
}
