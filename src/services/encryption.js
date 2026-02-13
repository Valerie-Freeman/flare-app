import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_USER_ID_KEY = 'flare.user_id';

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
  await clearUserIdFromStorage();
}
