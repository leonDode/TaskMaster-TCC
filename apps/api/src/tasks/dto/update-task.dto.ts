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
  ValidateIf,
} from 'class-validator';
import { TaskStatus, UnitType } from '@prisma/client';
import { MAX_TARGET_VALUE } from '../../common/quantitative';

// `recurrenceFrequency` e `kind` não existem aqui de propósito: tanto o modo
// (avulsa vs recorrente) quanto o tipo (booleana vs quantitativa) são
// imutáveis após a criação (ver plano — evita casos de borda de conclusões e
// progresso acumulados mudando de sentido).
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Aceita `null` explícito para remover a categoria.
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  // --- alvo/unidade (só em tasks QUANTITATIVE, e só enquanto não houver
  // progresso registrado — ver TasksService.validateUpdateShape) ---
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_TARGET_VALUE)
  targetValue?: number;

  @IsOptional()
  @IsEnum(UnitType)
  unit?: UnitType;

  // --- modo avulso ---
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;

  // --- modo recorrente ---
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
