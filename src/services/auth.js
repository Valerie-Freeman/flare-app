import { supabase } from './supabase';
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
