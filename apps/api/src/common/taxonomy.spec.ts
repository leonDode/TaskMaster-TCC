import { CategoryType, TaskKind, UnitType } from '@prisma/client';
import { CATEGORY_TYPES, TASK_KINDS, UNIT_TYPES } from '@task-master/shared';

// Os enums de taxonomia existem em dois lugares por necessidade: o Prisma
// precisa deles para o DDL, e packages/shared precisa deles sem depender de
// @prisma/client (o front não pode importar Prisma). Este teste é a única
// coisa impedindo os dois lados de divergirem em silêncio — se alguém
// adicionar um valor num lado só, a suíte quebra aqui.
describe('taxonomia: Prisma <-> @task-master/shared', () => {
  it.each([
    ['TaskKind', TaskKind, TASK_KINDS],
    ['UnitType', UnitType, UNIT_TYPES],
    ['CategoryType', CategoryType, CATEGORY_TYPES],
  ])(
    '%s tem exatamente os mesmos valores dos dois lados',
    (_name, prismaEnum, sharedValues) => {
      expect(Object.values(prismaEnum).sort()).toEqual(
        [...sharedValues].sort(),
      );
    },
  );
});
