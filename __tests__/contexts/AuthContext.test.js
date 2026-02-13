import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { signOut as authSignOut } from '../../src/services/auth';

jest.mock('expo-secure-store');

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('../../src/services/auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/encryption', () => ({
  clearAllLocalAuthData: jest.fn().mockResolvedValue(undefined),
}));

let authStateCallback;

beforeEach(() => {
  jest.clearAllMocks();

  supabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  supabase.auth.onAuthStateChange.mockImplementation((callback) => {
    authStateCallback = callback;
    return {
      data: {
        subscription: { unsubscribe: jest.fn() },
      },
    };
  });
});

function renderAuthHook() {
  return renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });
}

describe('AuthProvider', () => {
  it('starts in loading state with no session', async () => {
    const { result } = renderAuthHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toBeNull();
  });

  it('provides the session after initial load', async () => {
    const mockSession = { access_token: 'token', user: { id: 'user-1' } };
    supabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderAuthHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toEqual(mockSession);
  });

  it('updates session when auth state changes', async () => {
    const { result } = renderAuthHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newSession = { access_token: 'new-token', user: { id: 'user-2' } };
    await act(async () => {
      authStateCallback('SIGNED_IN', newSession);
    });

    expect(result.current.session).toEqual(newSession);
  });

  it('delegates signOut to the auth service', async () => {
    const { result } = renderAuthHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(authSignOut).toHaveBeenCalled();
  });
});
