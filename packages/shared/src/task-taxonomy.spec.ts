import {
  CATEGORY_TYPES,
  SUGGESTED_UNITS_BY_CATEGORY_TYPE,
  UNIT_TYPES,
  unitsForCategoryType,
} from './task-taxonomy';

describe('SUGGESTED_UNITS_BY_CATEGORY_TYPE', () => {
  it('tem entrada para todo CategoryType', () => {
    for (const categoryType of CATEGORY_TYPES) {
      expect(SUGGESTED_UNITS_BY_CATEGORY_TYPE[categoryType]).toBeDefined();
    }
    expect(Object.keys(SUGGESTED_UNITS_BY_CATEGORY_TYPE).sort()).toEqual(
      [...CATEGORY_TYPES].sort(),
    );
  });

  it('só referencia unidades do catálogo', () => {
    for (const units of Object.values(SUGGESTED_UNITS_BY_CATEGORY_TYPE)) {
      for (const unit of units) {
        expect(UNIT_TYPES).toContain(unit);
      }
    }
  });

  it('não sugere a mesma unidade duas vezes', () => {
    for (const units of Object.values(SUGGESTED_UNITS_BY_CATEGORY_TYPE)) {
      expect(new Set(units).size).toBe(units.length);
    }
  });

  it('nenhum tipo fica sem sugestão', () => {
    for (const units of Object.values(SUGGESTED_UNITS_BY_CATEGORY_TYPE)) {
      expect(units.length).toBeGreaterThan(0);
    }
  });

  it('OTHER é o catálogo completo, sem filtro', () => {
    expect(SUGGESTED_UNITS_BY_CATEGORY_TYPE.OTHER).toEqual(UNIT_TYPES);
  });
});

describe('unitsForCategoryType', () => {
  it('devolve o catálogo inteiro, sem esconder nem duplicar unidade', () => {
    for (const categoryType of CATEGORY_TYPES) {
      const units = unitsForCategoryType(categoryType);
      expect(units.length).toBe(UNIT_TYPES.length);
      expect([...units].sort()).toEqual([...UNIT_TYPES].sort());
    }
  });

  it('coloca as sugeridas na frente, na ordem curada', () => {
    const suggested = SUGGESTED_UNITS_BY_CATEGORY_TYPE.STUDY;
    expect(unitsForCategoryType('STUDY').slice(0, suggested.length)).toEqual([
      ...suggested,
    ]);
  });
});
