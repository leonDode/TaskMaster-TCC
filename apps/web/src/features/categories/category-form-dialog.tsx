import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CATEGORY_TYPES, type CategoryType } from '@task-master/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from '@/features/categories/use-category-mutations';
import {
  CATEGORY_COLOR_PRESET,
  DEFAULT_CATEGORY_COLOR,
} from '@/features/categories/category-colors';
import type { Category } from '@/features/categories/types';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Name is required.').max(60),
  type: z.enum(CATEGORY_TYPES, { message: 'Choose a category type.' }),
  // Free hex string, not a strict enum: an existing category may have a
  // legacy color outside the current preset, and editing it (without
  // touching the color) must not be blocked by validation. The preset is
  // enforced by only offering those 9 swatches in the UI below.
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a color.'),
});

type Input_ = z.infer<typeof schema>;

// No silent default: an unselected type is an empty string, which fails
// `z.enum` validation and forces the user to explicitly choose one.
const UNSET_TYPE = '' as CategoryType;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}

const DEFAULT_COLOR = DEFAULT_CATEGORY_COLOR;

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const createCategory = useCreateCategoryMutation();
  const updateCategory = useUpdateCategoryMutation();
  const isEditing = !!category;
  const pending = createCategory.isPending || updateCategory.isPending;

  const form = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '',
      type: category?.type ?? UNSET_TYPE,
      color: category?.color ?? DEFAULT_COLOR,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? '',
        type: category?.type ?? UNSET_TYPE,
        color: category?.color ?? DEFAULT_COLOR,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  function onSubmit(values: Input_) {
    const onSuccess = () => onOpenChange(false);
    if (isEditing) {
      updateCategory.mutate({ id: category.id, input: values }, { onSuccess });
    } else {
      createCategory.mutate(values, { onSuccess });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card rounded-lg border border-outline-variant">
        <DialogHeader>
          <DialogTitle className="text-headline-lg-mobile text-on-surface">
            {isEditing
              ? t('categories.editCategoryDialogTitle')
              : t('categories.createCategoryDialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-card-gap"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('categories.nameLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-input rounded-lg"
                      placeholder={t('categories.namePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('categories.typeLabel')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-input w-full rounded-lg">
                        <SelectValue
                          placeholder={t('categories.typePlaceholder')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`categories.typeOptions.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('categories.colorLabel')}
                  </FormLabel>
                  <FormControl>
                    <div
                      role="radiogroup"
                      aria-label={t('categories.colorLabel')}
                      className="grid grid-cols-3 gap-3"
                    >
                      {CATEGORY_COLOR_PRESET.map((color) => {
                        const selected = field.value === color.hex;
                        const name = t(color.labelKey);
                        return (
                          <button
                            key={color.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={name}
                            onClick={() => field.onChange(color.hex)}
                            className={cn(
                              'size-10 justify-self-center rounded-full border-2 border-outline-variant transition-all',
                              selected &&
                                'ring-on-surface ring-2 ring-offset-2 ring-offset-background',
                            )}
                            style={{ backgroundColor: color.hex }}
                          />
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('categories.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
              >
                {isEditing
                  ? t('categories.saveChangesButton')
                  : t('categories.createCategoryButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
