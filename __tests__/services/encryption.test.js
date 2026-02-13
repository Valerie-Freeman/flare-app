import * as SecureStore from 'expo-secure-store';
import {
  storeUserIdLocally,
  getUserIdFromStorage,
  clearUserIdFromStorage,
  clearAllLocalAuthData,
} from '../../src/services/encryption';

jest.mock('expo-secure-store');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('storeUserIdLocally', () => {
  it('stores the user ID in SecureStore', async () => {
    await storeUserIdLocally('user-123');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'flare.user_id',
      'user-123'
    );
  });
});

describe('getUserIdFromStorage', () => {
  it('retrieves the user ID from SecureStore', async () => {
    SecureStore.getItemAsync.mockResolvedValue('user-123');

    const result = await getUserIdFromStorage();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('flare.user_id');
    expect(result).toBe('user-123');
  });

  it('returns null when no user ID is stored', async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);

    const result = await getUserIdFromStorage();

    expect(result).toBeNull();
  });
});

describe('clearUserIdFromStorage', () => {
  it('deletes the user ID from SecureStore', async () => {
    await clearUserIdFromStorage();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('flare.user_id');
  });
});

describe('clearAllLocalAuthData', () => {
  it('clears the user ID from storage', async () => {
    await clearAllLocalAuthData();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('flare.user_id');
  });
});
