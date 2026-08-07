// Lógica pura de expansão de recorrência — sem Prisma/NestJS, reutilizável
// por web/mobile (preview client-side) e, futuramente, por Challenges se
// precisarem de padrões além de "uma vez por dia durante a janela".
//
// Datas são sempre strings de calendário puras ('YYYY-MM-DD'), nunca
// timestamps/objetos Date com timezone — quem resolve "qual é hoje no meu
// fuso" é o cliente (ver plano, seção "Timezone e virada de dia"). Toda
// aritmética aqui usa Date.UTC/getUTC* deliberadamente, para que o resultado
// nunca dependa do fuso horário da máquina que executa o código.
//
// Política de overflow (dia-do-mês/ano que não existe no mês/ano alvo):
// CLAMP para o último dia válido do mês — "todo dia 31" cai no dia 30 em
// abril; "todo 29/fev" cai em 28/fev em ano não bissexto. Ver justificativa
// no plano (decisão de produto deliberadamente diferente do default do
// RFC 5545, que pularia o mês inteiro).

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface RecurrenceRuleBase {
  /** 'YYYY-MM-DD' — primeira ocorrência possível. */
  startDate: string;
  /** 'YYYY-MM-DD' | null — null significa recorrência infinita. */
  endDate: string | null;
}

export type RecurrenceRule =
  | (RecurrenceRuleBase & { frequency: 'DAILY' })
  | (RecurrenceRuleBase & {
      frequency: 'WEEKLY';
      /** 0=domingo .. 6=sábado */
      daysOfWeek: number[];
    })
  | (RecurrenceRuleBase & {
      frequency: 'MONTHLY';
      /** 1-31 */
      dayOfMonth: number;
    })
  | (RecurrenceRuleBase & {
      frequency: 'YEARLY';
      /** 1-12 */
      month: number;
      /** 1-31 */
      dayOfMonth: number;
    });

interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

function parseDate(iso: string): YMD {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function formatDate({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toEpochDay({ y, m, d }: YMD): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function fromEpochDay(epochDay: number): YMD {
  const date = new Date(epochDay * 86_400_000);
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  };
}

function weekdayOfEpochDay(epochDay: number): number {
  return new Date(epochDay * 86_400_000).getUTCDay();
}

function daysInMonth(y: number, m: number): number {
  // Dia 0 do mês seguinte = último dia do mês m. Aproveita a normalização
  // de calendário nativa do Date.UTC (já trata ano bissexto corretamente).
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function compareYMD(a: YMD, b: YMD): number {
  return toEpochDay(a) - toEpochDay(b);
}

function maxYMD(a: YMD, b: YMD): YMD {
  return compareYMD(a, b) >= 0 ? a : b;
}

function minYMD(a: YMD, b: YMD): YMD {
  return compareYMD(a, b) <= 0 ? a : b;
}

function nextMonth(y: number, m: number): { y: number; m: number } {
  return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
}

export function expandOccurrences(
  rule: RecurrenceRule,
  windowStart: string,
  windowEnd: string,
): string[] {
  const ruleStart = parseDate(rule.startDate);
  const ruleEnd = rule.endDate ? parseDate(rule.endDate) : null;
  const winStart = parseDate(windowStart);
  const winEnd = parseDate(windowEnd);

  const effectiveStart = maxYMD(ruleStart, winStart);
  const effectiveEnd = ruleEnd ? minYMD(ruleEnd, winEnd) : winEnd;

  if (compareYMD(effectiveStart, effectiveEnd) > 0) {
    return [];
  }

  switch (rule.frequency) {
    case 'DAILY':
      return expandDaily(effectiveStart, effectiveEnd);
    case 'WEEKLY':
      return expandWeekly(effectiveStart, effectiveEnd, rule.daysOfWeek);
    case 'MONTHLY':
      return expandMonthly(effectiveStart, effectiveEnd, rule.dayOfMonth);
    case 'YEARLY':
      return expandYearly(
        effectiveStart,
        effectiveEnd,
        rule.month,
        rule.dayOfMonth,
      );
  }
}

function expandDaily(start: YMD, end: YMD): string[] {
  const result: string[] = [];
  const endEpoch = toEpochDay(end);
  for (let epoch = toEpochDay(start); epoch <= endEpoch; epoch++) {
    result.push(formatDate(fromEpochDay(epoch)));
  }
  return result;
}

function expandWeekly(start: YMD, end: YMD, daysOfWeek: number[]): string[] {
  const result: string[] = [];
  const daySet = new Set(daysOfWeek);
  const endEpoch = toEpochDay(end);
  for (let epoch = toEpochDay(start); epoch <= endEpoch; epoch++) {
    if (daySet.has(weekdayOfEpochDay(epoch))) {
      result.push(formatDate(fromEpochDay(epoch)));
    }
  }
  return result;
}

function expandMonthly(start: YMD, end: YMD, dayOfMonth: number): string[] {
  const result: string[] = [];
  const startEpoch = toEpochDay(start);
  const endEpoch = toEpochDay(end);
  let y = start.y;
  let m = start.m;

  while (true) {
    const candidate: YMD = { y, m, d: Math.min(dayOfMonth, daysInMonth(y, m)) };
    const candidateEpoch = toEpochDay(candidate);
    if (candidateEpoch > endEpoch) break;
    if (candidateEpoch >= startEpoch) {
      result.push(formatDate(candidate));
    }
    ({ y, m } = nextMonth(y, m));
  }
  return result;
}

function expandYearly(
  start: YMD,
  end: YMD,
  month: number,
  dayOfMonth: number,
): string[] {
  const result: string[] = [];
  const startEpoch = toEpochDay(start);
  const endEpoch = toEpochDay(end);
  let y = start.y;

  while (true) {
    const candidate: YMD = {
      y,
      m: month,
      d: Math.min(dayOfMonth, daysInMonth(y, month)),
    };
    const candidateEpoch = toEpochDay(candidate);
    if (candidateEpoch > endEpoch) break;
    if (candidateEpoch >= startEpoch) {
      result.push(formatDate(candidate));
    }
    y += 1;
  }
  return result;
}
