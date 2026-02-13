import { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { clearAllLocalAuthData } from '../services/encryption';
import { signOut as authSignOut } from '../services/auth';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Check network connectivity using Supabase health check
  const checkNetwork = async () => {
    try {
      // Use auth session check - doesn't require RLS permissions
      const { error } = await supabase.auth.getSession();
      setIsOnline(!error);
      return !error;
    } catch {
      setIsOnline(false);
      return false;
    }
  };

  useEffect(() => {
    // Check network on app state change
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkNetwork();
      }
    });

    // Initial network check
    checkNetwork();

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === 'SIGNED_OUT') {
        await clearAllLocalAuthData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await authSignOut();
  };

  const value = {
    session,
    isLoading,
    isOnline,
    signOut,
    checkNetwork,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
