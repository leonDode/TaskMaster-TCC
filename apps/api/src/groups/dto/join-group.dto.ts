import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  @Length(8, 8)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  inviteCode!: string;
}
