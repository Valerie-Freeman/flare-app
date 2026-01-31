import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  clearAllLocalAuthData,
  getMEKFromStorage,
  storeMEKLocally,
  storeUserIdLocally,
} from '../services/encryption';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsRecoveryPassphrase, setNeedsRecoveryPassphrase] = useState(false);

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
        setNeedsRecoveryPassphrase(false);
      }

      if (event === 'PASSWORD_RECOVERY') {
        // User clicked password reset link
        setNeedsRecoveryPassphrase(true);
      }

      if (event === 'SIGNED_IN' && session) {
        // Check if this is after a password reset
        const pendingReset = session.user?.user_metadata?.password_reset_pending;
        if (pendingReset) {
          setNeedsRecoveryPassphrase(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    await clearAllLocalAuthData();
  };

  const clearRecoveryFlag = async () => {
    setNeedsRecoveryPassphrase(false);
    await supabase.auth.updateUser({
      data: { password_reset_pending: false },
    });
  };

  const value = {
    session,
    isLoading,
    needsRecoveryPassphrase,
    signOut,
    clearRecoveryFlag,
    storeMEKLocally,
    getMEKFromStorage,
    storeUserIdLocally,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
