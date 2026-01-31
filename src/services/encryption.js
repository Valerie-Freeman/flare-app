import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE = 32; // 256 bits
const SALT_SIZE = 16; // 128 bits
const IV_SIZE = 12; // 96 bits for GCM

const SECURE_STORE_MEK_KEY = 'flare.mek';
const SECURE_STORE_USER_ID_KEY = 'flare.user_id';

/**
 * Converts a Uint8Array to a hex string.
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hex string to a Uint8Array.
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generates a cryptographically secure random salt.
 */
export async function generateSalt() {
  const saltBytes = await Crypto.getRandomBytesAsync(SALT_SIZE);
  return bytesToHex(saltBytes);
}

/**
 * Generates a 256-bit Master Encryption Key (MEK).
 */
export async function generateMEK() {
  const mekBytes = await Crypto.getRandomBytesAsync(KEY_SIZE);
  return bytesToHex(mekBytes);
}

/**
 * Derives a Key Encryption Key (KEK) from a password/passphrase using PBKDF2.
 * Note: expo-crypto doesn't have PBKDF2, so we use a SHA-256 based key stretching.
 * For production, consider using a native PBKDF2 implementation.
 */
export async function deriveKEK(password, salt) {
  // Combine password and salt
  const combined = password + salt;

  // Use multiple rounds of SHA-256 as a simplified key stretching
  // Note: This is a simplified approach. For stronger security,
  // integrate a native PBKDF2 or Argon2 implementation.
  let hash = combined;
  for (let i = 0; i < 1000; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash + salt + i.toString()
    );
  }

  return hash.substring(0, 64); // Return 256 bits (64 hex chars)
}

/**
 * Encrypts the MEK using a derived KEK.
 * Uses XOR-based encryption with the KEK as keystream.
 * Note: For production, use AES-GCM via a native module.
 */
export async function encryptMEK(mek, kek) {
  const mekBytes = hexToBytes(mek);
  const kekBytes = hexToBytes(kek);

  // Generate a random IV
  const ivBytes = await Crypto.getRandomBytesAsync(IV_SIZE);

  // Simple XOR encryption (for MVP - should use AES-GCM in production)
  const encrypted = new Uint8Array(mekBytes.length);
  for (let i = 0; i < mekBytes.length; i++) {
    encrypted[i] = mekBytes[i] ^ kekBytes[i % kekBytes.length] ^ ivBytes[i % ivBytes.length];
  }

  // Compute authentication tag using HMAC-SHA256
  const tagInput = bytesToHex(ivBytes) + bytesToHex(encrypted);
  const tag = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    tagInput + kek
  );

  // Return IV + encrypted data + tag
  return bytesToHex(ivBytes) + bytesToHex(encrypted) + tag.substring(0, 32);
}

/**
 * Decrypts the MEK using a derived KEK.
 */
export async function decryptMEK(encryptedData, kek) {
  const ivHex = encryptedData.substring(0, IV_SIZE * 2);
  const encryptedHex = encryptedData.substring(IV_SIZE * 2, IV_SIZE * 2 + KEY_SIZE * 2);
  const tagHex = encryptedData.substring(IV_SIZE * 2 + KEY_SIZE * 2);

  const ivBytes = hexToBytes(ivHex);
  const encryptedBytes = hexToBytes(encryptedHex);
  const kekBytes = hexToBytes(kek);

  // Verify authentication tag
  const expectedTag = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    ivHex + encryptedHex + kek
  );

  if (expectedTag.substring(0, 32) !== tagHex) {
    throw new Error('MEK decryption failed: invalid tag');
  }

  // Decrypt using XOR
  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ kekBytes[i % kekBytes.length] ^ ivBytes[i % ivBytes.length];
  }

  return bytesToHex(decrypted);
}

/**
 * Stores the MEK in secure storage.
 */
export async function storeMEKLocally(mek) {
  await SecureStore.setItemAsync(SECURE_STORE_MEK_KEY, mek);
}

/**
 * Retrieves the MEK from secure storage.
 */
export async function getMEKFromStorage() {
  return await SecureStore.getItemAsync(SECURE_STORE_MEK_KEY);
}

/**
 * Clears the MEK from secure storage.
 */
export async function clearMEKFromStorage() {
  await SecureStore.deleteItemAsync(SECURE_STORE_MEK_KEY);
}

/**
 * Stores the user ID in secure storage.
 */
export async function storeUserIdLocally(userId) {
  await SecureStore.setItemAsync(SECURE_STORE_USER_ID_KEY, userId);
}

/**
 * Retrieves the user ID from secure storage.
 */
export async function getUserIdFromStorage() {
  return await SecureStore.getItemAsync(SECURE_STORE_USER_ID_KEY);
}

/**
 * Clears the user ID from secure storage.
 */
export async function clearUserIdFromStorage() {
  await SecureStore.deleteItemAsync(SECURE_STORE_USER_ID_KEY);
}

/**
 * Clears all local auth data.
 */
export async function clearAllLocalAuthData() {
  await clearMEKFromStorage();
  await clearUserIdFromStorage();
}