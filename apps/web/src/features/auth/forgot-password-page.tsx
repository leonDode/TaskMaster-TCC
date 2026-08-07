import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
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
import { useForgotPassword } from '@/features/auth/use-auth';
import { useTranslation } from '@/lib/i18n/use-translation';

const schema = z.object({
  email: z.email('Enter a valid email address.'),
});

type Input_ = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const forgotPassword = useForgotPassword();
  const form = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

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
            {t('forgotPassword.title')}
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            {t('forgotPassword.subtitle')}
          </p>
        </div>

        {forgotPassword.isSuccess ? (
          <p className="text-body-sm text-on-surface text-center">
            {t('forgotPassword.successMessage')}
          </p>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                forgotPassword.mutate(values.email),
              )}
              className="space-y-card-gap"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                      {t('forgotPassword.emailLabel')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          type="email"
                          placeholder={t('forgotPassword.emailPlaceholder')}
                          className="bg-input rounded-lg pl-10"
                          autoComplete="email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {forgotPassword.error && (
                <p className="text-destructive text-body-sm">
                  {forgotPassword.error.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={forgotPassword.isPending}
                className="mt-6 w-full rounded-lg bg-primary py-3 hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
              >
                {t('forgotPassword.submitButton')}
              </Button>
            </form>
          </Form>
        )}

        <p className="text-body-sm text-on-surface-variant mt-8 text-center">
          <Link
            to="/login"
            className="text-primary hover:text-primary-container font-semibold"
          >
            {t('forgotPassword.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
