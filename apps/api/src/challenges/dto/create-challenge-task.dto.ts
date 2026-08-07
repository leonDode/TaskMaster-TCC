import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskKind, UnitType } from '@prisma/client';
import { MAX_TARGET_VALUE } from '../../common/quantitative';

export class CreateChallengeTaskDto {
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Reservado p/ pontuação ponderada futura; MVP sempre 1 (ver Fase 5).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  points?: number;

  // --- tipo da task; mesma semântica e mesmos enums da task pessoal ---
  // Sem noção de categoria aqui: Category é estritamente pessoal
  // (@@unique([userId, name])) e não faz sentido num contexto de grupo — a UI
  // do desafio mostra o catálogo global de unidades (ver plano, Requisito 5).
  @IsOptional()
  @IsEnum(TaskKind)
  kind?: TaskKind;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_TARGET_VALUE)
  targetValue?: number;

  @IsOptional()
  @IsEnum(UnitType)
  unit?: UnitType;
}
