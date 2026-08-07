import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateChallengeTaskDto } from './create-challenge-task.dto';

export class CreateChallengeDto {
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @ValidateNested({ each: true })
  @Type(() => CreateChallengeTaskDto)
  @ArrayMinSize(1)
  tasks!: CreateChallengeTaskDto[];
}
