import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../../services/authService';

const jsonResponse = (body: any, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('signIn stores both access and refresh tokens on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ token: 'access-1', refreshToken: 'refresh-1', user: { id: 'u1', email: 'a@b.com' } })
    ));

    const user = await authService.signIn('a@b.com', 'password123');

    expect(user.email).toBe('a@b.com');
    expect(localStorage.getItem('sacred_core_token')).toBe('access-1');
    expect(localStorage.getItem('sacred_core_refresh_token')).toBe('refresh-1');
  });

  it('signIn surfaces the server error message on invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ success: false, error: 'Invalid email or password' }, 401)
    ));

    await expect(authService.signIn('a@b.com', 'wrong')).rejects.toThrow('Invalid email or password');
  });

  it('getCurrentUser transparently refreshes an expired access token and retries once', async () => {
    localStorage.setItem('sacred_core_token', 'expired-access');
    localStorage.setItem('sacred_core_refresh_token', 'refresh-1');

    const fetchMock = vi.fn()
      // First call: /api/auth/me with the expired token -> 401
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'Unauthorized' }, 401))
      // Second call: /api/auth/refresh -> new token pair
      .mockResolvedValueOnce(jsonResponse({ token: 'new-access', refreshToken: 'new-refresh' }))
      // Third call: /api/auth/me retried with the new token -> success
      .mockResolvedValueOnce(jsonResponse({ user: { id: 'u1', email: 'a@b.com' } }));

    vi.stubGlobal('fetch', fetchMock);

    const user = await authService.getCurrentUser();

    expect(user?.email).toBe('a@b.com');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem('sacred_core_token')).toBe('new-access');
    expect(localStorage.getItem('sacred_core_refresh_token')).toBe('new-refresh');
  });

  it('getCurrentUser clears tokens and returns null when the refresh token is also invalid', async () => {
    localStorage.setItem('sacred_core_token', 'expired-access');
    localStorage.setItem('sacred_core_refresh_token', 'expired-refresh');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'Invalid or expired refresh token' }, 401));

    vi.stubGlobal('fetch', fetchMock);

    const user = await authService.getCurrentUser();

    expect(user).toBeNull();
    expect(localStorage.getItem('sacred_core_token')).toBeNull();
    expect(localStorage.getItem('sacred_core_refresh_token')).toBeNull();
  });

  it('resetPassword rejects since password reset is not implemented', async () => {
    await expect(authService.resetPassword('a@b.com')).rejects.toThrow('not implemented');
  });
});
