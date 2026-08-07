import { useAuthStore } from '@/stores/auth-store';

/**
 * Auth-store setup for component tests.
 *
 * `useUserQuery` is gated on `enabled: status === 'authenticated'` and the
 * store starts at `'loading'`, so any spec rendering a component that calls
 * that hook (profile, group detail, challenge detail, the app shell) sits on
 * its LoadingState forever unless this runs *before* the render.
 */
export function signInTestUser() {
  // Only `status` is set: nothing outside the store itself reads
  // `state.session`, so fabricating a Supabase `Session` would be invented
  // data no assertion depends on. Add it here if that ever changes.
  useAuthStore.setState({ status: 'authenticated' });
}

/**
 * Back to the store's initial state. `useAuthStore` is a module singleton, so
 * without this a test that signs the user out (or in) leaks into the ones
 * after it and makes the file order-dependent.
 */
export function resetAuthStore() {
  useAuthStore.setState({ status: 'loading', session: null });
}
