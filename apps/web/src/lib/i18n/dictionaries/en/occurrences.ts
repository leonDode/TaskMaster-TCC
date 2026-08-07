import type { NamespaceDictionary } from '../../types';

const occurrences = {
  title: 'Calendar',
  allFilter: 'All',
  loadingLabel: 'Loading calendar…',
  taskCount: {
    one: '{count} task scheduled',
    other: '{count} tasks scheduled',
  },
  emptyTitle: 'No tasks for this day',
  emptyDescription: 'Pick another day or add a new task.',
  addTaskButton: 'Add task',
  weekdayShort: {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  },
} satisfies NamespaceDictionary;

export default occurrences;
