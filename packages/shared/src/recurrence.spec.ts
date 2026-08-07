import { expandOccurrences, RecurrenceRule } from './recurrence';

describe('expandOccurrences', () => {
  describe('DAILY', () => {
    it('retorna todo dia dentro de uma janela simples', () => {
      const rule: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-03-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2026-03-01', '2026-03-05')).toEqual([
        '2026-03-01',
        '2026-03-02',
        '2026-03-03',
        '2026-03-04',
        '2026-03-05',
      ]);
    });
  });

  describe('WEEKLY', () => {
    it('respeita os dias da semana selecionados cruzando fronteira de semana/mês', () => {
      // seg=1, qua=3, sex=5. Janela cruza a virada de fevereiro -> março/2026.
      const rule: RecurrenceRule = {
        frequency: 'WEEKLY',
        daysOfWeek: [1, 3, 5],
        startDate: '2026-02-01',
        endDate: null,
      };
      // 2026-02-25 é quarta, 2026-03-02 é segunda (confirma cruzamento de mês)
      expect(expandOccurrences(rule, '2026-02-23', '2026-03-03')).toEqual([
        '2026-02-23', // segunda
        '2026-02-25', // quarta
        '2026-02-27', // sexta
        '2026-03-02', // segunda
      ]);
    });
  });

  describe('MONTHLY', () => {
    it('retorna um candidato por mês dentro da janela', () => {
      const rule: RecurrenceRule = {
        frequency: 'MONTHLY',
        dayOfMonth: 10,
        startDate: '2026-01-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2026-01-01', '2026-04-30')).toEqual([
        '2026-01-10',
        '2026-02-10',
        '2026-03-10',
        '2026-04-10',
      ]);
    });

    it('dia 31 num mês de 30 dias cai no último dia do mês (clamp, não pula)', () => {
      const rule: RecurrenceRule = {
        frequency: 'MONTHLY',
        dayOfMonth: 31,
        startDate: '2026-01-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2026-04-01', '2026-04-30')).toEqual([
        '2026-04-30',
      ]);
    });

    it('dia 31 em fevereiro de ano não bissexto cai em 28/fev', () => {
      const rule: RecurrenceRule = {
        frequency: 'MONTHLY',
        dayOfMonth: 31,
        startDate: '2026-01-01',
        endDate: null,
      };
      // 2026 não é bissexto
      expect(expandOccurrences(rule, '2026-02-01', '2026-02-28')).toEqual([
        '2026-02-28',
      ]);
    });

    it('dia 31 em fevereiro de ano bissexto cai em 29/fev', () => {
      const rule: RecurrenceRule = {
        frequency: 'MONTHLY',
        dayOfMonth: 31,
        startDate: '2024-01-01',
        endDate: null,
      };
      // 2024 é bissexto
      expect(expandOccurrences(rule, '2024-02-01', '2024-02-29')).toEqual([
        '2024-02-29',
      ]);
    });

    it('não gera ocorrência no mês inicial se o dia clampeado for anterior ao startDate', () => {
      const rule: RecurrenceRule = {
        frequency: 'MONTHLY',
        dayOfMonth: 15,
        startDate: '2026-01-20',
        endDate: null,
      };
      // 15/jan seria antes do startDate (20/jan) -> pula pro mês seguinte
      expect(expandOccurrences(rule, '2026-01-01', '2026-02-28')).toEqual([
        '2026-02-15',
      ]);
    });
  });

  describe('YEARLY', () => {
    it('retorna um candidato por ano dentro da janela', () => {
      const rule: RecurrenceRule = {
        frequency: 'YEARLY',
        month: 12,
        dayOfMonth: 25,
        startDate: '2024-01-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2024-01-01', '2026-12-31')).toEqual([
        '2024-12-25',
        '2025-12-25',
        '2026-12-25',
      ]);
    });

    it('29/fev em ano não bissexto cai em 28/fev; em ano bissexto cai em 29/fev', () => {
      const rule: RecurrenceRule = {
        frequency: 'YEARLY',
        month: 2,
        dayOfMonth: 29,
        startDate: '2023-01-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2023-01-01', '2024-12-31')).toEqual([
        '2023-02-28', // 2023: não bissexto
        '2024-02-29', // 2024: bissexto
      ]);
    });
  });

  describe('limites da janela e da regra', () => {
    it('recurrenceEndDate antes da janela consultada -> nenhuma ocorrência', () => {
      const rule: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01',
        endDate: '2026-01-10',
      };
      expect(expandOccurrences(rule, '2026-02-01', '2026-02-28')).toEqual([]);
    });

    it('recurrenceStartDate depois da janela consultada -> nenhuma ocorrência', () => {
      const rule: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-05-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2026-02-01', '2026-02-28')).toEqual([]);
    });

    it('inclui ocorrência exatamente no limite inferior (from) da janela', () => {
      const rule: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2026-03-15', '2026-03-20')).toContain(
        '2026-03-15',
      );
    });

    it('inclui ocorrência exatamente no limite superior (to) da janela', () => {
      const rule: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01',
        endDate: null,
      };
      expect(expandOccurrences(rule, '2026-03-15', '2026-03-20')).toContain(
        '2026-03-20',
      );
    });

    it('inclui ocorrência exatamente no recurrenceEndDate quando ele cai dentro da janela', () => {
      const rule: RecurrenceRule = {
        frequency: 'DAILY',
        startDate: '2026-01-01',
        endDate: '2026-03-17',
      };
      const result = expandOccurrences(rule, '2026-03-15', '2026-03-20');
      expect(result).toEqual(['2026-03-15', '2026-03-16', '2026-03-17']);
    });
  });

  // Nenhum caso de DST é necessário: a função opera só sobre datas de
  // calendário (Date.UTC/getUTC*, sem hora/offset), então horário de verão
  // não altera o resultado por construção — ver comentário no topo do
  // módulo e a seção "Timezone e virada de dia" do plano.
});
