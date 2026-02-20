import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getUserById } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import { fullSync, clearLocalEntries } from '../services/fuelService';
import type { AuthError } from '@supabase/supabase-js';

// Combined user type that works with both local and Supabase auth
export type User = {
  id: number; // Local IndexedDB ID (0 for Supabase-only users)
  supabaseId?: string; // Supabase UUID
  email: string;
  name: string;
  createdAt?: string;
  emailConfirmed?: boolean;
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

const SESSION_KEY = 'combust_user_session';
const LOCAL_USER_MAP_KEY = 'combust_local_user_map'; // Maps supabaseId to localId

// Get or create local user ID for a Supabase user
async function getOrCreateLocalUserId(supabaseId: string): Promise<number> {
  try {
    const mapStr = localStorage.getItem(LOCAL_USER_MAP_KEY);
    const map: Record<string, number> = mapStr ? JSON.parse(mapStr) : {};
    
    if (map[supabaseId]) {
      return map[supabaseId];
    }
    
    // Generate a new local ID (use timestamp-based ID)
    const newLocalId = Date.now();
    map[supabaseId] = newLocalId;
    localStorage.setItem(LOCAL_USER_MAP_KEY, JSON.stringify(map));
    return newLocalId;
  } catch {
    return Date.now();
  }
}

// Helper to extract user data from Supabase auth user
function getUserFromSession(session: { user: { id: string; email?: string | null; user_metadata?: { name?: string }; email_confirmed_at?: string | null } }, localId: number): User {
  return {
    id: localId,
    supabaseId: session.user.id,
    email: session.user.email || '',
    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
    emailConfirmed: session.user.email_confirmed_at != null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  const user = authState.status === 'authenticated' ? authState.user : null;
  const isLoading = authState.status === 'loading';

  // Initialize auth state from Supabase session
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for existing Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthState({ status: 'unauthenticated' });
          return;
        }

        if (session?.user) {
          // User is authenticated via Supabase
          const localId = await getOrCreateLocalUserId(session.user.id);
          const user = getUserFromSession(session, localId);
          
          if (mounted) {
            setAuthState({ status: 'authenticated', user });
            // Run sync in background
            fullSync(localId, session.user.id).catch(console.error);
          }
        } else {
          // Check for legacy local session
          const sessionData = localStorage.getItem(SESSION_KEY);
          if (sessionData) {
            const { userId } = JSON.parse(sessionData);
            const localUser = await getUserById(userId);
            if (localUser && mounted) {
              setAuthState({ 
                status: 'authenticated', 
                user: {
                  id: localUser.id!,
                  email: localUser.email,
                  name: localUser.name,
                  createdAt: localUser.createdAt,
                }
              });
              return;
            }
          }
          
          if (mounted) {
            setAuthState({ status: 'unauthenticated' });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState({ status: 'unauthenticated' });
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        const localId = await getOrCreateLocalUserId(session.user.id);
        const user = getUserFromSession(session, localId);

        if (mounted) {
          setAuthState({ status: 'authenticated', user });
          // Run sync after sign in
          fullSync(localId, session.user.id).catch(console.error);
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(SESSION_KEY);
        if (mounted) {
          setAuthState({ status: 'unauthenticated' });
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Session refreshed, update user info if needed
        const localId = await getOrCreateLocalUserId(session.user.id);
        const user = getUserFromSession(session, localId);
        
        if (mounted) {
          setAuthState({ status: 'authenticated', user });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string; needsConfirmation?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        // Check if email is not confirmed
        if (error.message.includes('Email not confirmed') || 
            error.message.includes('email_not_confirmed') ||
            (error as AuthError).code === 'email_not_confirmed') {
          setAuthState({ status: 'awaiting_confirmation', email });
          return { needsConfirmation: true };
        }
        return { error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        setAuthState({ status: 'awaiting_confirmation', email });
        return { needsConfirmation: true };
      }

      // Auth state change listener will handle the rest
      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ error?: string; needsConfirmation?: boolean }> => {
    try {
      console.log('Starting signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      console.log('Signup response:', { data, error });

      if (error) {
        console.error('Signup error:', error);
        return { error: error.message };
      }

      // Check if user already exists in auth (Supabase returns user with identities = [])
      // This happens when trying to sign up with an email that's already registered
      if (data.user && data.user.identities?.length === 0) {
        return { error: 'An account with this email already exists. Please sign in instead.' };
      }

      // User created but needs email confirmation
      if (data.user && !data.user.email_confirmed_at) {
        console.log('Email confirmation required');
        setAuthState({ status: 'awaiting_confirmation', email });
        return { needsConfirmation: true };
      }

      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear local data first
      if (user?.id) {
        await clearLocalEntries(user.id);
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local session
      localStorage.removeItem(SESSION_KEY);
      
      setAuthState({ status: 'unauthenticated' });
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out even on error
      localStorage.removeItem(SESSION_KEY);
      setAuthState({ status: 'unauthenticated' });
    }
  }, [user?.id]);

  const resendConfirmationEmail = useCallback(async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error('Resend confirmation error:', error);
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
