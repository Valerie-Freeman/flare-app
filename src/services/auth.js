import { supabase } from './supabase';
import {
  storeUserIdLocally,
  clearAllLocalAuthData,
} from './encryption';

/**
 * Signs up a new user with email and password.
 */
export async function signUp(email, password) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw authError;
  }

  const userId = authData.user.id;
  await storeUserIdLocally(userId);

  return { user: authData.user, session: authData.session };
}

/**
 * Signs in an existing user with email and password.
 * Uses server-side rate limiting via database functions.
 */
export async function signIn(email, password) {
  // Check server-side rate limiting
  const { data: allowed, error: rateError } = await supabase
    .rpc('check_login_allowed', { p_email: email });

  if (rateError) {
    console.error('Rate limit check error:', rateError);
    // Continue with login attempt if rate limit check fails
  } else if (!allowed) {
    // Get remaining lockout time
    const { data: remaining } = await supabase
      .rpc('get_lockout_remaining', { p_email: email });

    const minutes = Math.ceil((remaining || 900) / 60);
    throw new Error(`Too many failed attempts. Please try again in ${minutes} minutes.`);
  }

  // Attempt authentication
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  // Record the attempt (success or failure)
  const success = !authError;
  try {
    await supabase.rpc('record_login_attempt', {
      p_email: email,
      p_success: success,
      p_ip_address: null,
    });
  } catch (err) {
    console.error('Failed to record login attempt:', err);
  }

  if (authError) {
    // Use generic error message to avoid information leakage
    throw new Error('Authentication failed. Please check your credentials and try again.');
  }

  const userId = authData.user.id;
  await storeUserIdLocally(userId);

  return { user: authData.user, session: authData.session };
}

/**
 * Signs out the current user and clears local data.
 */
export async function signOut() {
  await clearAllLocalAuthData();
  await supabase.auth.signOut();
}

/**
 * Sends a password reset email.
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'flare://reset-password',
  });

  if (error) {
    throw error;
  }
}
