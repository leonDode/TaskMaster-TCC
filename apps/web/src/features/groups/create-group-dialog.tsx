import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import type { Group } from '@/features/groups/types';
import {
  useCreateGroupMutation,
  useUpdateGroupMutation,
} from '@/features/groups/use-group-mutations';
import { useTranslation } from '@/lib/i18n/use-translation';

const schema = z.object({
  name: z.string().min(1, 'Name is required.').max(80),
  description: z.string().max(500).optional().or(z.literal('')),
});

type Input_ = z.infer<typeof schema>;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  group,
}: CreateGroupDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!group;
  const createGroup = useCreateGroupMutation();
  const updateGroup = useUpdateGroupMutation(group?.id ?? '');
  const pending = createGroup.isPending || updateGroup.isPending;

  const form = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
    },
  });

  function onSubmit(values: Input_) {
    const input = {
      name: values.name,
      description: values.description || undefined,
    };
    const onSuccess = () => onOpenChange(false);
    if (isEditing) {
      updateGroup.mutate(input, { onSuccess });
    } else {
      createGroup.mutate(input, { onSuccess });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          form.reset({
            name: group?.name ?? '',
            description: group?.description ?? '',
          });
        }
      }}
    >
      <DialogContent className="bg-card rounded-lg border border-outline-variant">
        <DialogHeader>
          <DialogTitle className="text-headline-lg-mobile text-on-surface">
            {isEditing ? t('groups.editGroupTitle') : t('groups.newGroupTitle')}
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
                    {t('groups.nameLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-input rounded-lg"
                      placeholder={t('groups.namePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('groups.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea className="bg-input rounded-lg" {...field} />
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
                {t('groups.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
              >
                {isEditing
                  ? t('groups.saveChangesButton')
                  : t('groups.createGroupSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
