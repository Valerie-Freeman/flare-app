import { supabase } from './supabase';
import * as SecureStore from 'expo-secure-store';
import {
  generateMEK,
  generateSalt,
  deriveKEK,
  encryptMEK,
  decryptMEK,
  storeMEKLocally,
  storeUserIdLocally,
  clearAllLocalAuthData,
} from './encryption';
import { generatePassphrase } from '../utils/passphrase';

// Login attempt tracking constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_ATTEMPTS_KEY = 'flare.login_attempts';

/**
 * Gets login attempt data for an email from secure storage.
 */
async function getLoginAttempts(email) {
  try {
    const data = await SecureStore.getItemAsync(LOGIN_ATTEMPTS_KEY);
    if (!data) return { attempts: 0, lockoutUntil: null };
    const attempts = JSON.parse(data);
    return attempts[email.toLowerCase()] || { attempts: 0, lockoutUntil: null };
  } catch {
    return { attempts: 0, lockoutUntil: null };
  }
}

/**
 * Updates login attempt data for an email in secure storage.
 */
async function setLoginAttempts(email, attemptData) {
  try {
    const data = await SecureStore.getItemAsync(LOGIN_ATTEMPTS_KEY);
    const attempts = data ? JSON.parse(data) : {};
    attempts[email.toLowerCase()] = attemptData;
    await SecureStore.setItemAsync(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Checks if login is locked out for an email.
 * Returns { locked: boolean, remainingMs: number }
 */
export async function checkLoginLockout(email) {
  const { lockoutUntil } = await getLoginAttempts(email);
  if (!lockoutUntil) return { locked: false, remainingMs: 0 };

  const remaining = lockoutUntil - Date.now();
  if (remaining <= 0) {
    // Lockout expired, reset
    await setLoginAttempts(email, { attempts: 0, lockoutUntil: null });
    return { locked: false, remainingMs: 0 };
  }

  return { locked: true, remainingMs: remaining };
}

/**
 * Records a failed login attempt. Returns lockout info.
 */
export async function recordFailedLogin(email) {
  const { attempts } = await getLoginAttempts(email);
  const newAttempts = attempts + 1;

  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOGIN_LOCKOUT_DURATION_MS;
    await setLoginAttempts(email, { attempts: newAttempts, lockoutUntil });
    return {
      locked: true,
      remainingMs: LOGIN_LOCKOUT_DURATION_MS,
      attempts: newAttempts
    };
  }

  await setLoginAttempts(email, { attempts: newAttempts, lockoutUntil: null });
  return {
    locked: false,
    remainingMs: 0,
    attempts: newAttempts,
    remaining: MAX_LOGIN_ATTEMPTS - newAttempts
  };
}

/**
 * Clears login attempts on successful login.
 */
export async function clearLoginAttempts(email) {
  await setLoginAttempts(email, { attempts: 0, lockoutUntil: null });
}

/**
 * Signs up a new user with email and password.
 * Generates MEK and recovery passphrase.
 */
export async function signUp(email, password) {
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw authError;
  }

  const userId = authData.user.id;

  // Generate keys
  const mek = await generateMEK();
  const passphrase = await generatePassphrase();

  // Generate salts
  const passwordSalt = await generateSalt();
  const recoverySalt = await generateSalt();

  // Derive KEKs
  const passwordKEK = await deriveKEK(password, passwordSalt);
  const recoveryKEK = await deriveKEK(passphrase, recoverySalt);

  // Encrypt MEK with both KEKs
  const encryptedMekPassword = await encryptMEK(mek, passwordKEK);
  const encryptedMekRecovery = await encryptMEK(mek, recoveryKEK);

  // Store in Supabase
  const { error: dbError } = await supabase.from('user_keys').insert({
    user_id: userId,
    encrypted_mek_password: encryptedMekPassword,
    encrypted_mek_recovery: encryptedMekRecovery,
    password_salt: passwordSalt,
    recovery_salt: recoverySalt,
  });

  if (dbError) {
    // Log the actual error for debugging
    console.error('Database error during registration:', dbError);
    // Rollback: delete the user if key storage fails
    await supabase.auth.admin?.deleteUser(userId);
    throw new Error(`Failed to complete registration: ${dbError.message}`);
  }

  // Store MEK locally
  await storeMEKLocally(mek);
  await storeUserIdLocally(userId);

  return { user: authData.user, passphrase };
}

/**
 * Signs in an existing user with email and password.
 * Decrypts and caches MEK locally.
 */
export async function signIn(email, password) {
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    throw authError;
  }

  const userId = authData.user.id;

  // Fetch user keys
  const { data: keys, error: keysError } = await supabase
    .from('user_keys')
    .select('encrypted_mek_password, password_salt')
    .eq('user_id', userId)
    .single();

  if (keysError || !keys) {
    throw new Error('Failed to retrieve keys');
  }

  // Derive KEK and decrypt MEK
  const passwordKEK = await deriveKEK(password, keys.password_salt);
  const mek = await decryptMEK(keys.encrypted_mek_password, passwordKEK);

  // Store MEK locally
  await storeMEKLocally(mek);
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

/**
 * Recovers MEK using the recovery passphrase after password reset.
 * Re-encrypts MEK with new password.
 */
export async function recoverWithPassphrase(passphrase, newPassword) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Fetch recovery key data
  const { data: keys, error: keysError } = await supabase
    .from('user_keys')
    .select('encrypted_mek_recovery, recovery_salt')
    .eq('user_id', user.id)
    .single();

  if (keysError || !keys) {
    throw new Error('Failed to retrieve recovery keys');
  }

  // Derive recovery KEK and decrypt MEK
  const recoveryKEK = await deriveKEK(passphrase, keys.recovery_salt);

  let mek;
  try {
    mek = await decryptMEK(keys.encrypted_mek_recovery, recoveryKEK);
  } catch {
    throw new Error('Invalid recovery passphrase');
  }

  // Generate new password salt and encrypt MEK
  const newPasswordSalt = await generateSalt();
  const newPasswordKEK = await deriveKEK(newPassword, newPasswordSalt);
  const newEncryptedMek = await encryptMEK(mek, newPasswordKEK);

  // Update in database
  const { error: updateError } = await supabase
    .from('user_keys')
    .update({
      encrypted_mek_password: newEncryptedMek,
      password_salt: newPasswordSalt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (updateError) {
    throw new Error('Failed to update keys');
  }

  // Clear reset pending flag
  await supabase.auth.updateUser({
    data: { password_reset_pending: false },
  });

  // Store MEK locally
  await storeMEKLocally(mek);
  await storeUserIdLocally(user.id);

  return { success: true };
}

/**
 * Regenerates the recovery passphrase.
 * Requires re-authentication and current MEK.
 */
export async function regeneratePassphrase(currentMEK) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Generate new passphrase and salt
  const newPassphrase = await generatePassphrase();
  const newRecoverySalt = await generateSalt();

  // Derive new recovery KEK and encrypt MEK
  const newRecoveryKEK = await deriveKEK(newPassphrase, newRecoverySalt);
  const newEncryptedMekRecovery = await encryptMEK(currentMEK, newRecoveryKEK);

  // Update in database
  const { error: updateError } = await supabase
    .from('user_keys')
    .update({
      encrypted_mek_recovery: newEncryptedMekRecovery,
      recovery_salt: newRecoverySalt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (updateError) {
    throw new Error('Failed to update recovery passphrase');
  }

  return { passphrase: newPassphrase };
}
