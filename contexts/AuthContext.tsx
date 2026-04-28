import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService, User } from '@infra/auth/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, avatar?: string) => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Subscribe to auth changes
  useEffect(() => {
    let unsubscribeFn: (() => void) | undefined;
    
    const setupAuth = async () => {
      unsubscribeFn = await authService.onAuthStateChange((currentUser) => {
        setUser(currentUser);
        setIsLoading(false);
      });
    };

    setupAuth();

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const newUser = await authService.signUp(email, password, name);
        setUser(newUser);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const loggedInUser = await authService.signIn(email, password);
        setUser(loggedInUser);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (name: string, avatar?: string) => {
      setError(null);
      try {
        const updatedUser = await authService.updateProfile(name, avatar);
        setUser(updatedUser);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Update failed';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
