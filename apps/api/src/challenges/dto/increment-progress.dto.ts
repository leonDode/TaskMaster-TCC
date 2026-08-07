import { IsNumber, IsPositive, Max } from 'class-validator';
import { MAX_TARGET_VALUE } from '../../common/quantitative';

// Progresso de desafio só cresce. Diferente do lado pessoal, aqui NÃO existe
// modo `value` absoluto nem delta negativo: o leaderboard é o núcleo do
// produto, e poder desfazer o que já foi contabilizado abre brecha para
// manipular ranking.
//
// A restrição é estrutural, não um `if` no service: o ValidationPipe global
// roda com forbidNonWhitelisted (ver main.ts), então um corpo com `value`
// é rejeitado com 400 por a propriedade simplesmente não existir aqui.
// `delta: 0` e `delta: -5` caem no @IsPositive().
export class IncrementProgressDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_TARGET_VALUE)
  delta!: number;
}
