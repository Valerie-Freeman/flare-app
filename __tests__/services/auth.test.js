import { signUp, signIn, signOut, resetPassword } from '../../src/services/auth';
import { supabase } from '../../src/services/supabase';
import { storeUserIdLocally, clearAllLocalAuthData } from '../../src/services/encryption';

jest.mock('expo-secure-store');

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

jest.mock('../../src/services/encryption', () => ({
  storeUserIdLocally: jest.fn().mockResolvedValue(undefined),
  clearAllLocalAuthData: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signUp', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockSession = { access_token: 'token-abc' };

  it('creates a new user and stores user ID locally', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await signUp('test@example.com', 'password123');

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(storeUserIdLocally).toHaveBeenCalledWith('user-123');
    expect(result).toEqual({ user: mockUser, session: mockSession });
  });

  it('throws when Supabase returns an auth error', async () => {
    const authError = new Error('Email already registered');
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: authError,
    });

    await expect(signUp('test@example.com', 'password123')).rejects.toThrow(
      'Email already registered'
    );
    expect(storeUserIdLocally).not.toHaveBeenCalled();
  });
});

describe('signIn', () => {
  const mockUser = { id: 'user-456', email: 'test@example.com' };
  const mockSession = { access_token: 'token-def' };

  it('signs in a user when rate limit allows', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await signIn('test@example.com', 'password123');

    expect(supabase.rpc).toHaveBeenCalledWith('check_login_allowed', {
      p_email: 'test@example.com',
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('record_login_attempt', {
      p_email: 'test@example.com',
      p_success: true,
      p_ip_address: null,
    });
    expect(storeUserIdLocally).toHaveBeenCalledWith('user-456');
    expect(result).toEqual({ user: mockUser, session: mockSession });
  });

  it('throws a lockout error when rate limited', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: 600, error: null });

    await expect(signIn('test@example.com', 'password123')).rejects.toThrow(
      'Too many failed attempts. Please try again in 10 minutes.'
    );
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('uses generic error message on auth failure', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
    });
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(signIn('test@example.com', 'wrong')).rejects.toThrow(
      'Authentication failed. Please check your credentials and try again.'
    );
  });

  it('records a failed login attempt on auth error', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
    });
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(signIn('test@example.com', 'wrong')).rejects.toThrow();

    expect(supabase.rpc).toHaveBeenCalledWith('record_login_attempt', {
      p_email: 'test@example.com',
      p_success: false,
      p_ip_address: null,
    });
  });

  it('continues login even if rate limit check fails', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('DB error'),
    });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await signIn('test@example.com', 'password123');

    expect(result).toEqual({ user: mockUser, session: mockSession });
  });
});

describe('signOut', () => {
  it('clears local data and signs out of Supabase', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(clearAllLocalAuthData).toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  it('sends a password reset email with the deep link redirect', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await resetPassword('test@example.com');

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: 'flare://reset-password' }
    );
  });

  it('throws when Supabase returns an error', async () => {
    const error = new Error('Rate limit exceeded');
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error });

    await expect(resetPassword('test@example.com')).rejects.toThrow(
      'Rate limit exceeded'
    );
  });
});
