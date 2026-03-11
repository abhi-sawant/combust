import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthError } from '@supabase/supabase-js';

export type User = {
  id: string;    // Supabase UUID
  email: string;
  name: string;
  emailConfirmed: boolean;
};

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User }
  | { status: 'awaiting_confirmation'; email: string };

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<{ error?: string }>;
  setAwaitingConfirmation: (email: string) => void;
  clearAwaitingConfirmation: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function userFromSession(session: { user: { id: string; email?: string | null; user_metadata?: { name?: string }; email_confirmed_at?: string | null } }): User {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User',
    emailConfirmed: session.user.email_confirmed_at != null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  const user = authState.status === 'authenticated' ? authState.user : null;
  const isLoading = authState.status === 'loading';

  useEffect(() => {
    let mounted = true;

    // Restore existing Supabase session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error || !session) {
        setAuthState({ status: 'unauthenticated' });
        return;
      }
      setAuthState({ status: 'authenticated', user: userFromSession(session) });
    });

    // Listen for auth changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
        setAuthState({ status: 'authenticated', user: userFromSession(session) });
      } else if (event === 'SIGNED_OUT') {
        setAuthState({ status: 'unauthenticated' });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setAuthState({ status: 'authenticated', user: userFromSession(session) });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        if (
          error.message.includes('Email not confirmed') ||
          (error as AuthError).code === 'email_not_confirmed'
        ) {
          setAuthState({ status: 'awaiting_confirmation', email });
          return { needsConfirmation: true };
        }
        return { error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        setAuthState({ status: 'awaiting_confirmation', email });
        return { needsConfirmation: true };
      }

      return {};
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { name: name.trim() } },
      });

      if (error) return { error: error.message };

      if (data.user && data.user.identities?.length === 0) {
        return { error: 'An account with this email already exists. Please sign in instead.' };
      }

      if (data.user && !data.user.email_confirmed_at) {
        setAuthState({ status: 'awaiting_confirmation', email });
        return { needsConfirmation: true };
      }

      return {};
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setAuthState({ status: 'unauthenticated' });
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.toLowerCase().trim() });
      if (error) return { error: error.message };
      return {};
    } catch {
      return { error: 'Failed to resend confirmation email. Please try again.' };
    }
  }, []);

  const setAwaitingConfirmation = useCallback((email: string) => {
    setAuthState({ status: 'awaiting_confirmation', email });
  }, []);

  const clearAwaitingConfirmation = useCallback(() => {
    setAuthState({ status: 'unauthenticated' });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      authState,
      signIn,
      signUp,
      signOut,
      resendConfirmationEmail,
      setAwaitingConfirmation,
      clearAwaitingConfirmation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
