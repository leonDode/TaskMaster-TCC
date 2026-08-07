import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RecurrenceFrequency, TaskKind, UnitType } from '@prisma/client';
import { MAX_TARGET_VALUE } from '../../common/quantitative';

// Validação de "forma" (tipos/formato) fica aqui. A regra de negócio
// "avulsa XOR recorrente, com os campos certos por frequência" e
// "targetValue/unit exigem kind=QUANTITATIVE" ficam no TasksService (ver
// validateCreateShape / validateKindShape) — expressar essas combinações via
// puro @ValidateIf ficaria ilegível.
export class CreateTaskDto {
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // --- tipo da task ---
  // Opcional para não quebrar clientes que só criam tasks booleanas; o
  // service assume BOOLEAN quando ausente. A UI sempre manda explícito.
  @IsOptional()
  @IsEnum(TaskKind)
  kind?: TaskKind;

  // Casa com Decimal(12,2) no schema.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_TARGET_VALUE)
  targetValue?: number;

  // Catálogo global — a sugestão por CategoryType é só ordenação na UI, o
  // backend aceita qualquer unidade válida (ver plano, Requisito 4).
  @IsOptional()
  @IsEnum(UnitType)
  unit?: UnitType;

  // --- modo avulso ---
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;

  // --- modo recorrente ---
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrenceFrequency?: RecurrenceFrequency;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDaysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  recurrenceDayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  recurrenceMonth?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  recurrenceStartDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  recurrenceEndDate?: string;
}
