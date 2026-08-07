import type { NamespaceDictionary } from '../../types';

const dashboard = {
  title: 'Hoje',
  newTask: 'Nova Tarefa',
  tasksToday: 'Tarefas de hoje',
  categories: 'Categorias',
  allFilter: 'Todas',
  todaysFocus: 'Foco de Hoje',
  loadingLabel: 'Carregando tarefas de hoje…',
  emptyTitle: 'Nada agendado para hoje',
  emptyDescription: 'Aproveite a calmaria, ou crie uma nova tarefa.',
  consistencyTitle: 'Consistência',
  consistencySubtitle: 'Últimas 12 semanas, por categoria',
  consistencyLess: 'menos',
  consistencyMore: 'mais',
  consistencyEmpty: 'Sem conclusões nas últimas 12 semanas.',
  consistencyUncategorized: 'Sem categoria',
  consistencyCell: '{date} — {done} de {total} concluídas',
  consistencyCellEmpty: '{date} — nenhuma tarefa',
} satisfies NamespaceDictionary;

export default dashboard;
