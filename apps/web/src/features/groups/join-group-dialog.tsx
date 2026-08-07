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
import { useJoinGroupMutation } from '@/features/groups/use-group-mutations';
import { useTranslation } from '@/lib/i18n/use-translation';

const schema = z.object({
  inviteCode: z
    .string()
    .length(8, 'Invite codes are 8 characters.')
    .transform((v) => v.toUpperCase()),
});

type Input_ = z.infer<typeof schema>;

interface JoinGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinGroupDialog({ open, onOpenChange }: JoinGroupDialogProps) {
  const { t } = useTranslation();
  const joinGroup = useJoinGroupMutation();
  const form = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: { inviteCode: '' },
  });

  function onSubmit(values: Input_) {
    joinGroup.mutate(values.inviteCode, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) form.reset({ inviteCode: '' });
      }}
    >
      <DialogContent className="bg-card rounded-lg border border-outline-variant">
        <DialogHeader>
          <DialogTitle className="text-headline-lg-mobile text-on-surface">
            {t('groups.joinGroupTitle')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-card-gap"
          >
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('groups.inviteCodeLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-input rounded-lg uppercase"
                      placeholder={t('groups.inviteCodePlaceholder')}
                      maxLength={8}
                      {...field}
                    />
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
                disabled={joinGroup.isPending}
                className="bg-primary hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
              >
                {t('groups.joinGroupSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
