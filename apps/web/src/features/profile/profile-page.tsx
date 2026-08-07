import { zodResolver } from '@hookform/resolvers/zod';
import { ImageUp, LogOut } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useUpdateUserMutation } from '@/features/profile/use-update-user-mutation';
import { useUploadAvatarMutation } from '@/features/profile/use-upload-avatar-mutation';
import { useUserQuery } from '@/features/profile/use-user-query';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useAuthStore } from '@/stores/auth-store';

// `avatarUrl` is absent on purpose — the API rejects it on PATCH /users/me,
// and the avatar is edited through the upload button instead.
const schema = z.object({
  displayName: z.string().max(120).optional().or(z.literal('')),
  timezone: z.string().min(1, 'Choose a timezone.'),
});

type Input_ = z.infer<typeof schema>;

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProfilePage() {
  const { t } = useTranslation();
  const { data: user, isPending, isError, error, refetch } = useUserQuery();
  const updateUser = useUpdateUserMutation();
  const uploadAvatar = useUploadAvatarMutation();
  const forceSignOut = useAuthStore((state) => state.forceSignOut);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectedTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const form = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', timezone: detectedTimezone },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName ?? '',
        timezone: detectedTimezone,
      });
    }
  }, [user, form, detectedTimezone]);

  if (isPending) {
    return <LoadingState label={t('profile.loadingLabel')} />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const initials = (user.displayName ?? user.email)
    .trim()
    .charAt(0)
    .toUpperCase();

  function onSubmit(values: Input_) {
    updateUser.mutate({
      displayName: values.displayName || undefined,
      timezone: values.timezone,
    });
  }

  /**
   * Client-side checks are for feedback speed only — the server re-validates
   * by reading the file's magic bytes, precisely because `file.type` here is
   * just a client-supplied claim.
   */
  function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be picked again after a failed attempt.
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error(t('profile.avatarTooLarge'));
      return;
    }
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast.error(t('profile.avatarInvalidType'));
      return;
    }

    uploadAvatar.mutate(file);
  }

  return (
    <div>
      <PageHeader title={t('profile.title')} />

      <div className="bg-card relative flex flex-col items-center gap-8 overflow-hidden rounded-lg border border-outline-variant p-gutter sm:flex-row">
        <Avatar className="border-primary shrink-0 border-2 p-1 neon-border-primary size-32">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-surface-container-high text-on-surface text-headline-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <h1 className="text-headline-lg text-on-surface">
            {user.displayName ?? user.email}
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2">
            {user.email}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(',')}
            onChange={onAvatarSelected}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={uploadAvatar.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageUp className="size-4" />
            {uploadAvatar.isPending
              ? t('profile.uploadingAvatar')
              : t('profile.changeAvatar')}
          </Button>
        </div>
      </div>

      <div className="mt-card-gap bg-card rounded-lg border border-outline-variant p-gutter">
        <div className="border-surface-variant/50 mb-6 flex items-center gap-3 border-b pb-4">
          <h2 className="text-title-md text-on-surface">
            {t('profile.accountSettings')}
          </h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('profile.displayNameLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input className="bg-input rounded-lg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-caps text-on-surface-variant uppercase">
                    {t('profile.timezoneLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      readOnly
                      disabled
                      className="bg-input rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={updateUser.isPending}>
                {t('profile.saveButton')}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={forceSignOut}
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <LogOut />
          {t('profile.signOut')}
        </Button>
      </div>
    </div>
  );
}
