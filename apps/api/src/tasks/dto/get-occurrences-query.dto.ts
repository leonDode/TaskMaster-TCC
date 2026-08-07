import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetOccurrencesQueryDto {
  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
