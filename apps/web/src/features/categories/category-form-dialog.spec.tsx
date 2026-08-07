import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFormDialog } from '@/features/categories/category-form-dialog';
import { renderWithProviders } from '@/test/render';

const { createCategory } = vi.hoisted(() => ({
  createCategory: vi.fn().mockResolvedValue({
    id: 'cat-1',
    userId: 'user-1',
    name: 'Gym',
    type: 'FITNESS',
    color: '#00f0ff',
    createdAt: '',
    updatedAt: '',
  }),
}));

vi.mock('@/features/categories/api', () => ({
  createCategory,
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  listCategories: vi.fn().mockResolvedValue([]),
}));

describe('CategoryFormDialog', () => {
  it('blocks submission without an explicit type', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CategoryFormDialog open onOpenChange={() => {}} />);

    await user.type(screen.getByPlaceholderText('e.g. Work'), 'Gym');
    await user.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() => {
      expect(createCategory).not.toHaveBeenCalled();
    });
  });

  it('includes the chosen type in the create payload', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CategoryFormDialog open onOpenChange={() => {}} />);

    await user.type(screen.getByPlaceholderText('e.g. Work'), 'Gym');

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Fitness' }));

    await user.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalled();
    });
    expect(createCategory.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Gym', type: 'FITNESS' }),
    );
  });
});
