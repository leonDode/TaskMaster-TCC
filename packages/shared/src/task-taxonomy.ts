// Taxonomia de tasks — enums do sistema e o mapeamento tipo de categoria ->
// unidades sugeridas. Vive aqui (e não em apps/api) para ser fonte única de
// verdade do contrato entre backend e front: a UI ordena/destaca as unidades
// sugeridas sem precisar de um endpoint dedicado só para isso.
//
// Deliberadamente SEM dependência de `@prisma/client`: o front não pode (nem
// deve) importar Prisma. Os mesmos valores são declarados como enums no
// schema.prisma, e um teste em apps/api/src/common/taxonomy.spec.ts garante
// que os dois lados nunca divirjam.

/** Discriminador do tipo de task, escolhido na criação e imutável depois. */
export const TASK_KINDS = ['BOOLEAN', 'QUANTITATIVE'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

/**
 * Catálogo fechado de unidades. `GENERIC_UNIT` é o fallback ("unidades") para
 * o que não se encaixa em nenhuma das demais.
 */
export const UNIT_TYPES = [
  'ML',
  'LITERS',
  'GRAMS',
  'KG',
  'KM',
  'METERS',
  'STEPS',
  'MINUTES',
  'HOURS',
  'REPS',
  'PAGES',
  'GLASSES',
  'CALORIES',
  'GENERIC_UNIT',
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

/**
 * Tipo de categoria — conceito separado de `Category.name`, que continua
 * texto livre. Obrigatório na criação: é o que alimenta a sugestão de
 * unidades abaixo.
 */
export const CATEGORY_TYPES = [
  'FITNESS',
  'HEALTH',
  'HYGIENE',
  'NUTRITION',
  'STUDY',
  'WORK',
  'HOME',
  'OTHER',
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

/**
 * Unidades sugeridas por tipo de categoria — **sugestão de UI, não restrição
 * de API**. O backend aceita qualquer `UnitType` do catálogo global numa task
 * QUANTITATIVE, independente da categoria; esta lista só define o que a UI
 * mostra primeiro/destacado no seletor.
 *
 * O tipo `Record<CategoryType, ...>` é proposital: adicionar um CategoryType
 * quebra a compilação até o mapeamento ser atualizado.
 */
export const SUGGESTED_UNITS_BY_CATEGORY_TYPE: Record<
  CategoryType,
  readonly UnitType[]
> = {
  FITNESS: ['KM', 'METERS', 'STEPS', 'MINUTES', 'REPS', 'KG', 'CALORIES'],
  HEALTH: ['ML', 'LITERS', 'GLASSES', 'MINUTES', 'HOURS', 'GENERIC_UNIT'],
  HYGIENE: ['MINUTES', 'GENERIC_UNIT'],
  NUTRITION: ['ML', 'LITERS', 'GLASSES', 'GRAMS', 'CALORIES'],
  STUDY: ['PAGES', 'MINUTES', 'HOURS'],
  WORK: ['MINUTES', 'HOURS', 'GENERIC_UNIT'],
  HOME: ['MINUTES', 'GENERIC_UNIT'],
  // Fallback: catálogo completo, sem filtro.
  OTHER: UNIT_TYPES,
};

/**
 * Catálogo completo ordenado para um tipo de categoria: as sugeridas primeiro
 * (na ordem curada acima), o resto depois. É o que o seletor de unidade da UI
 * consome — nunca esconde uma unidade, só reordena.
 */
export function unitsForCategoryType(
  categoryType: CategoryType,
): readonly UnitType[] {
  const suggested = SUGGESTED_UNITS_BY_CATEGORY_TYPE[categoryType];
  return [...suggested, ...UNIT_TYPES.filter((u) => !suggested.includes(u))];
}
