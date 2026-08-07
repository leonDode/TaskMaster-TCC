import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import { renderWithProviders } from '@/test/render';

const { createTask } = vi.hoisted(() => ({
  createTask: vi.fn().mockResolvedValue({
    id: 'task-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    title: 'Drink water',
    description: null,
    status: 'TODO',
    kind: 'QUANTITATIVE',
    targetValue: 2,
    unit: 'LITERS',
    dueDate: null,
    recurrenceFrequency: null,
    recurrenceDaysOfWeek: [],
    recurrenceDayOfMonth: null,
    recurrenceMonth: null,
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    createdAt: '',
    updatedAt: '',
  }),
}));

vi.mock('@/features/tasks/api', () => ({
  createTask,
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  listTasks: vi
    .fn()
    .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  getOccurrences: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/categories/api', () => ({
  listCategories: vi.fn().mockResolvedValue([
    {
      id: 'cat-1',
      userId: 'user-1',
      name: 'Fitness',
      type: 'FITNESS',
      color: '#00f0ff',
      createdAt: '',
      updatedAt: '',
    },
  ]),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

describe('TaskFormDialog', () => {
  it('orders the unit selector by the selected category type without filtering the catalog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);

    await user.type(
      screen.getByPlaceholderText('Enter task name…'),
      'Drink water',
    );

    const categorySelect = screen.getByRole('combobox', { name: 'Category' });
    await user.click(categorySelect);
    await user.click(await screen.findByRole('option', { name: 'Fitness' }));

    await user.click(
      screen.getByRole('button', { name: 'Can be incremented' }),
    );

    const unitSelect = screen.getByRole('combobox', { name: 'Unit' });
    await user.click(unitSelect);
    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    // FITNESS suggests KM first — the widget reorders, it never filters, so
    // the full 14-unit catalog must still be present (e.g. the generic unit).
    expect(options[0]).toHaveTextContent('km');
    expect(options).toHaveLength(14);
    expect(within(listbox).getByText('units')).toBeInTheDocument();

    await user.click(options[0]);

    await user.type(
      screen.getByRole('spinbutton', { name: 'Target value' }),
      '2',
    );

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    await waitFor(() => {
      expect(createTask).toHaveBeenCalled();
    });
    expect(createTask.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        title: 'Drink water',
        kind: 'QUANTITATIVE',
        targetValue: 2,
        unit: 'KM',
      }),
    );
  });
});
