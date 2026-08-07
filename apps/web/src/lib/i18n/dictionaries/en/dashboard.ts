import type { NamespaceDictionary } from '../../types';

const dashboard = {
  title: 'Today',
  newTask: 'New Task',
  tasksToday: 'Tasks today',
  categories: 'Categories',
  allFilter: 'All',
  todaysFocus: "Today's Focus",
  loadingLabel: "Loading today's tasks…",
  emptyTitle: 'Nothing scheduled for today',
  emptyDescription: 'Enjoy the calm, or create a new task.',
  consistencyTitle: 'Consistency',
  consistencySubtitle: 'Last 12 weeks, by category',
  consistencyLess: 'less',
  consistencyMore: 'more',
  consistencyEmpty: 'No completions in the last 12 weeks.',
  consistencyUncategorized: 'Uncategorized',
  consistencyCell: '{date} — {done} of {total} completed',
  consistencyCellEmpty: '{date} — no tasks',
} satisfies NamespaceDictionary;

export default dashboard;
