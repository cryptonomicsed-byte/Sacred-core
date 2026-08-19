/**
 * Real auth against server.ts (SQLite + bcrypt + JWT) — no Supabase dependency.
 * Interface kept stable so AuthContext/LoginPage don't need to change if this
 * later swaps to a hosted backend.
 */

const TOKEN_KEY = 'sacred_core_token';
const REFRESH_TOKEN_KEY = 'sacred_core_refresh_token';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt?: string;
}

type Listener = (user: User | null) => void;

class AuthService {
  private listeners = new Set<Listener>();

  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private emit(user: User | null): void {
    this.listeners.forEach((cb) => cb(user));
  }

  private async rawRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.getToken();
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {})
      }
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body?.error || `Request failed (${res.status})`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return body as T;
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const { token, refreshToken: newRefreshToken } = await this.rawRequest<{ token: string; refreshToken: string }>(
        '/api/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }) }
      );
      this.setTokens(token, newRefreshToken);
      return true;
    } catch {
      this.clearToken();
      return false;
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    try {
      return await this.rawRequest<T>(path, init);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 && path !== '/api/auth/refresh') {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.rawRequest<T>(path, init);
        }
      }
      throw err;
    }
  }

  async signUp(email: string, password: string, name: string): Promise<User> {
    const { token, refreshToken, user } = await this.request<{ token: string; refreshToken: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });

    this.setTokens(token, refreshToken);
    console.log(`✅ User signed up: ${email}`);
    this.emit(user);
    return user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const { token, refreshToken, user } = await this.request<{ token: string; refreshToken: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    this.setTokens(token, refreshToken);
    console.log(`✅ User signed in: ${email}`);
    this.emit(user);
    return user;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.getToken()) {
      return null;
    }

    try {
      const { user } = await this.request<{ user: User }>('/api/auth/me');
      console.log(`✅ Current user: ${user.email}`);
      return user;
    } catch {
      console.log('ℹ️ No authenticated user');
      this.clearToken();
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      await this.request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    } finally {
      this.clearToken();
      console.log('✅ User signed out');
      this.emit(null);
    }
  }

  async updateProfile(name: string, avatar?: string): Promise<User> {
    const { user } = await this.request<{ user: User }>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ name, avatar })
    });

    console.log('✅ Profile updated');
    this.emit(user);
    return user;
  }

  async resetPassword(_email: string): Promise<void> {
    throw new Error('Password reset is not implemented yet');
  }

  async onAuthStateChange(callback: Listener): Promise<() => void> {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const authService = new AuthService();
