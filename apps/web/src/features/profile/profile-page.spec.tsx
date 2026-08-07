import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from '@/features/profile/profile-page';
import type { User } from '@/features/profile/types';
import { resetAuthStore, signInTestUser } from '@/test/auth';
import { renderWithProviders } from '@/test/render';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'leon@example.com',
    displayName: 'Leon',
    avatarUrl: null,
    timezone: 'UTC',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const { getMe, updateMe, uploadAvatar, toastError } = vi.hoisted(() => ({
  getMe: vi.fn(),
  updateMe: vi.fn(),
  uploadAvatar: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/features/profile/api', () => ({ getMe, updateMe, uploadAvatar }));

// No <Toaster /> is mounted in the test tree, so assert on the call rather
// than on rendered toast text.
vi.mock('sonner', () => ({
  toast: { error: toastError, success: vi.fn() },
}));

afterEach(resetAuthStore);

// The profile page reads the browser's timezone instead of offering a
// picker, so tests pin it rather than depending on the host machine's TZ.
const BROWSER_TIMEZONE = 'America/Sao_Paulo';

vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
  timeZone: BROWSER_TIMEZONE,
} as Intl.ResolvedDateTimeFormatOptions);

function renderPage(user: User) {
  vi.clearAllMocks();
  // Must run before the render: `useUserQuery` reads the store's status to
  // decide whether to fire at all.
  signInTestUser();
  getMe.mockResolvedValue(user);
  updateMe.mockResolvedValue(user);
  uploadAvatar.mockResolvedValue(user);
  renderWithProviders(<ProfilePage />);
}

async function saveProfile(newName: string) {
  const user = userEvent.setup();
  const nameInput = await screen.findByDisplayValue('Leon');
  await user.clear(nameInput);
  await user.type(nameInput, newName);
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(updateMe).toHaveBeenCalled());
  return updateMe.mock.calls[0][0] as Record<string, unknown>;
}

describe('ProfilePage — PATCH payload', () => {
  it('does not send avatarUrl when editing the display name', async () => {
    renderPage(buildUser());
    const payload = await saveProfile('Leon Jr');

    // Asserting on the key itself, not just the value: the API rejects the
    // field outright (forbidNonWhitelisted), so a `avatarUrl: undefined`
    // creeping back in would still be a regression worth failing on.
    expect(Object.keys(payload)).not.toContain('avatarUrl');
    expect(payload).toEqual({
      displayName: 'Leon Jr',
      timezone: BROWSER_TIMEZONE,
    });
  });

  it('still omits avatarUrl for a user who already has an avatar', async () => {
    // This is the configuration that actually reproduced the 400: a non-empty
    // avatarUrl survived `|| undefined` and was serialized into the body.
    renderPage(buildUser({ avatarUrl: 'https://cdn.example.com/a.png' }));
    const payload = await saveProfile('Leon Jr');

    expect(Object.keys(payload)).not.toContain('avatarUrl');
  });

  it('no longer renders an avatar URL field', async () => {
    renderPage(buildUser({ avatarUrl: 'https://cdn.example.com/a.png' }));
    await screen.findByDisplayValue('Leon');

    expect(
      screen.queryByDisplayValue('https://cdn.example.com/a.png'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/avatar url/i)).not.toBeInTheDocument();
  });
});

describe('ProfilePage — timezone', () => {
  it('displays the browser-detected timezone instead of a picker', async () => {
    renderPage(buildUser({ timezone: 'UTC' }));
    const field = await screen.findByDisplayValue(BROWSER_TIMEZONE);

    expect(field).toBeInTheDocument();
    expect(field).toHaveAttribute('readonly');
    // No dropdown of every IANA zone rendered up front.
    expect(document.querySelector('select')).not.toBeInTheDocument();
  });

  it('saves the detected timezone even when it differs from the stored one', async () => {
    renderPage(buildUser({ timezone: 'UTC' }));
    const payload = await saveProfile('Leon Jr');

    expect(payload.timezone).toBe(BROWSER_TIMEZONE);
  });
});

describe('ProfilePage — avatar upload', () => {
  function pngFile(name: string, sizeBytes: number) {
    const file = new File(['x'], name, { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: sizeBytes });
    return file;
  }

  it('uploads an accepted image through the dedicated endpoint', async () => {
    const user = userEvent.setup();
    renderPage(buildUser());
    await screen.findByDisplayValue('Leon');

    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, pngFile('avatar.png', 1024));

    await waitFor(() => expect(uploadAvatar).toHaveBeenCalled());
    expect(updateMe).not.toHaveBeenCalled();
  });

  it('rejects a file over the 2MB limit without hitting the network', async () => {
    const user = userEvent.setup();
    renderPage(buildUser());
    await screen.findByDisplayValue('Leon');

    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, pngFile('huge.png', 3 * 1024 * 1024));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Image exceeds the 2MB limit.'),
    );
    expect(uploadAvatar).not.toHaveBeenCalled();
  });
});
