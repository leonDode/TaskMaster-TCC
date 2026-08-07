import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import logoIcon from '@/assets/logo-icon.png';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useResetPassword } from '@/features/auth/use-auth';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useAuthStore } from '@/stores/auth-store';

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

type Input_ = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const resetPassword = useResetPassword();
  const forceSignOut = useAuthStore((state) => state.forceSignOut);
  const navigate = useNavigate();

  const form = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  function onSubmit(values: Input_) {
    resetPassword.mutate(values.password, {
      onSuccess: () => {
        toast.success('Password updated. Please sign in again.');
        forceSignOut();
        navigate('/login', { replace: true });
      },
    });
  }

  return (
    <div className="[background:radial-gradient(circle_at_50%_50%,var(--card)_0%,var(--background)_100%)] flex min-h-screen items-center justify-center p-gutter">
      <div className="bg-card w-full max-w-md rounded-lg border border-outline-variant p-container-padding shadow-2xl">
        <div className="mb-8 text-center">
          <img
            src={logoIcon}
            alt="Task Master"
            className="mx-auto mb-4 h-[72px] w-auto"
          />
          <h1 className="text-headline-lg text-on-surface mb-2">
            {t('resetPassword.title')}
          </h1>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-card-gap"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('resetPassword.newPasswordLabel')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        type="password"
                        className="bg-input rounded-lg pl-10"
                        autoComplete="new-password"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('resetPassword.confirmPasswordLabel')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        type="password"
                        className="bg-input rounded-lg pl-10"
                        autoComplete="new-password"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {resetPassword.error && (
              <p className="text-destructive text-body-sm">
                {resetPassword.error.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={resetPassword.isPending}
              className="mt-6 w-full rounded-lg bg-primary py-3 hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
            >
              {t('resetPassword.submitButton')}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
