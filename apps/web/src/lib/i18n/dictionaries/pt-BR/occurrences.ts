import type { NamespaceDictionary } from '../../types';

const occurrences = {
  title: 'Calendário',
  allFilter: 'Todas',
  loadingLabel: 'Carregando calendário…',
  taskCount: {
    one: '{count} tarefa agendada',
    other: '{count} tarefas agendadas',
  },
  emptyTitle: 'Nenhuma tarefa para este dia',
  emptyDescription: 'Escolha outro dia ou adicione uma nova tarefa.',
  addTaskButton: 'Adicionar tarefa',
  weekdayShort: {
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sáb',
    sun: 'Dom',
  },
} satisfies NamespaceDictionary;

export default occurrences;
