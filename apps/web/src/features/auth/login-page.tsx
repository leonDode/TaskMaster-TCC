import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import logoFull from '@/assets/logo-full.png';
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
import {
  useSignIn,
  useSignInWithGoogle,
  useSignUp,
} from '@/features/auth/use-auth';
import { useTranslation } from '@/lib/i18n/use-translation';

const credentialsSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type CredentialsInput = z.infer<typeof credentialsSchema>;

export function LoginPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const signIn = useSignIn();
  const signUp = useSignUp();
  const signInWithGoogle = useSignInWithGoogle();

  const form = useForm<CredentialsInput>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const pendingMutation = mode === 'sign-in' ? signIn : signUp;
  const errorMessage = pendingMutation.error?.message;

  function onSubmit(values: CredentialsInput) {
    pendingMutation.mutate(values);
  }

  return (
    <div className="[background:radial-gradient(circle_at_50%_50%,var(--card)_0%,var(--background)_100%)] flex min-h-screen items-center justify-center p-gutter">
      {/* TODO: remove — credenciais temporárias para teste de terceiros */}
      <div className="bg-card fixed top-4 left-4 z-50 rounded-lg border border-outline-variant p-3 text-body-sm shadow-lg">
        <p className="text-label-caps text-on-surface-variant mb-1 uppercase">
          Acesso de teste
        </p>
        <p>
          <span className="text-on-surface-variant">email:</span>{' '}
          teste@pucrs.com
        </p>
        <p>
          <span className="text-on-surface-variant">senha:</span> teste123
        </p>
      </div>

      <div className="bg-card w-full max-w-md rounded-lg border border-outline-variant p-container-padding shadow-2xl">
        <div className="mb-8 text-center">
          <img
            src={logoFull}
            alt="Task Master"
            className="mx-auto mb-4 h-[84px] w-auto"
          />
          <p className="text-body-sm text-on-surface-variant">
            {t('login.subtitle')}
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-card-gap"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('login.emailLabel')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                      {t('login.passwordLabel')}
                    </FormLabel>
                    {mode === 'sign-in' && (
                      <Link
                        to="/forgot-password"
                        className="text-body-sm text-neon-cyan hover:underline"
                      >
                        {t('login.forgotLink')}
                      </Link>
                    )}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        type="password"
                        placeholder={t('login.passwordPlaceholder')}
                        className="bg-input rounded-lg pl-10"
                        autoComplete={
                          mode === 'sign-in'
                            ? 'current-password'
                            : 'new-password'
                        }
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && (
              <p className="text-destructive text-body-sm">{errorMessage}</p>
            )}

            <Button
              type="submit"
              disabled={pendingMutation.isPending}
              className="mt-6 w-full rounded-lg bg-primary py-3 hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
            >
              {mode === 'sign-in'
                ? t('login.signInButton')
                : t('login.signUpButton')}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </Form>

        <div className="mt-8">
          <div className="relative">
            <div className="border-outline-variant/30 absolute inset-0 flex items-center border-t" />
            <div className="relative flex justify-center">
              <span className="bg-card text-label-caps text-on-surface-variant px-2">
                {t('login.orContinueWith')}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={signInWithGoogle.isPending}
            onClick={() => signInWithGoogle.mutate()}
            className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 mt-6 w-full rounded-lg bg-transparent"
          >
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t('login.continueWithGoogle')}
          </Button>
        </div>

        <p className="text-body-sm text-on-surface-variant mt-8 text-center">
          {mode === 'sign-in' ? (
            <>
              {t('login.noAccount')}{' '}
              <button
                type="button"
                onClick={() => setMode('sign-up')}
                className="text-primary hover:text-primary-container font-semibold"
              >
                {t('login.signUpLink')}
              </button>
            </>
          ) : (
            <>
              {t('login.hasAccount')}{' '}
              <button
                type="button"
                onClick={() => setMode('sign-in')}
                className="text-primary hover:text-primary-container font-semibold"
              >
                {t('login.signInLink')}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
