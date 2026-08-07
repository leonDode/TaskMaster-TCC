import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase-client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  session: Session | null;
  status: AuthStatus;
  initialize: () => () => void;
  forceSignOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  status: 'loading',

  initialize: () => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, status: session ? 'authenticated' : 'unauthenticated' });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'authenticated' : 'unauthenticated' });
    });

    return () => subscription.unsubscribe();
  },

  forceSignOut: () => {
    void supabase.auth.signOut();
    set({ session: null, status: 'unauthenticated' });
  },
}));
