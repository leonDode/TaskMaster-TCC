import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { CategoryFormDialog } from '@/features/categories/category-form-dialog';
import { useCategoryTaskCounts } from '@/features/categories/use-category-task-counts';
import {
  categoryTint,
  FALLBACK_CATEGORY_COLOR,
} from '@/features/categories/category-colors';
import { useCategoriesQuery } from '@/features/categories/use-categories-query';
import { useDeleteCategoryMutation } from '@/features/categories/use-category-mutations';
import type { Category } from '@/features/categories/types';
import { useTranslation } from '@/lib/i18n/use-translation';
import { MoreVertical, Tag } from 'lucide-react';

export function CategoriesPage() {
  const { t } = useTranslation();
  const {
    data: categories,
    isPending,
    isError,
    error,
    refetch,
  } = useCategoriesQuery();
  const deleteCategory = useDeleteCategoryMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    Category | undefined
  >();

  const categoryIds = useMemo(
    () => (categories ?? []).map((c) => c.id),
    [categories],
  );
  const taskCounts = useCategoryTaskCounts(categoryIds);

  function openCreate() {
    setEditingCategory(undefined);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title={t('categories.title')}
        description={
          categories
            ? t('categories.manageDescription', { count: categories.length })
            : undefined
        }
      />

      {isPending ? (
        <LoadingState label={t('categories.loadingLabel')} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : categories.length === 0 ? (
        <EmptyState
          title={t('categories.emptyTitle')}
          description={t('categories.emptyDescription')}
          icon={Tag}
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t('categories.newCategoryButton')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-card border-outline-variant/10 hover:border-primary/50 group relative flex flex-col gap-4 overflow-hidden rounded-lg border p-6 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="size-3 rounded-full"
                    style={{
                      backgroundColor:
                        category.color ?? FALLBACK_CATEGORY_COLOR,
                      boxShadow: `0 0 8px ${category.color ?? FALLBACK_CATEGORY_COLOR}`,
                    }}
                  />
                  <h3 className="text-title-md text-on-surface">
                    {category.name}
                  </h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-on-surface-variant group-hover:text-on-surface">
                      <MoreVertical className="size-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(category)}>
                      {t('categories.editAction')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteCategory.mutate(category.id)}
                    >
                      {t('categories.deleteAction')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <span className="text-label-caps bg-surface-variant text-on-surface-variant inline-block rounded-full px-3 py-1">
                  {t(`categories.typeOptions.${category.type}`)}
                </span>
                <span
                  className="text-label-caps inline-block rounded-full px-3 py-1"
                  style={{
                    backgroundColor: categoryTint(category.color, 10),
                    color: category.color ?? FALLBACK_CATEGORY_COLOR,
                  }}
                >
                  {taskCounts[category.id] === undefined
                    ? '…'
                    : t('categories.taskCount', {
                        count: taskCounts[category.id],
                      })}
                </span>
              </div>
            </div>
          ))}

          <button
            onClick={openCreate}
            className="border-outline-variant/30 hover:border-primary hover:bg-primary/5 flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 transition-all"
          >
            <div className="bg-surface-variant flex size-12 items-center justify-center rounded-full">
              <Plus className="text-on-surface size-5" />
            </div>
            <span className="text-title-md text-on-surface-variant">
              {t('categories.newCategoryCard')}
            </span>
          </button>
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
      />
    </div>
  );
}
