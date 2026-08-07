import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateChallengeTaskDto } from './create-challenge-task.dto';

// `kind` é omitido de propósito: o tipo da task é imutável após a criação,
// igual ao lado pessoal (UpdateTaskDto) — progresso já acumulado mudaria de
// sentido. `targetValue`/`unit` continuam editáveis, mas só enquanto não
// houver progresso registrado (ver ChallengesService.updateTask).
export class UpdateChallengeTaskDto extends PartialType(
  OmitType(CreateChallengeTaskDto, ['kind'] as const),
) {}
