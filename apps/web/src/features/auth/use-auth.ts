import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

async function throwIfError<T extends { error: { message: string } | null }>(
  result: T,
) {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result;
}

export function useSignIn() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) =>
      throwIfError(await supabase.auth.signInWithPassword(input)),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) =>
      throwIfError(await supabase.auth.signUp(input)),
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: async () =>
      throwIfError(
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        }),
      ),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) =>
      throwIfError(
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      ),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (password: string) =>
      throwIfError(await supabase.auth.updateUser({ password })),
  });
}
