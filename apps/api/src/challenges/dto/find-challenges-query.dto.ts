import { IsIn, IsOptional } from 'class-validator';

export type ChallengeStatusFilter = 'active' | 'upcoming' | 'past';

export class FindChallengesQueryDto {
  @IsOptional()
  @IsIn(['active', 'upcoming', 'past'])
  status?: ChallengeStatusFilter;
}
