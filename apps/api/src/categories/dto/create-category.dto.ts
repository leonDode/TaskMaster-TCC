import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  // Obrigatório de propósito: é o que alimenta a sugestão de unidades da UI,
  // e categoria sem tipo quebraria essa sugestão. `name` continua livre — os
  // dois são conceitos diferentes.
  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
