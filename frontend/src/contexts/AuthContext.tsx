import React, { createContext, useContext, useState, useCallback } from 'react';
import { useActor } from '../hooks/useActor';

export type UserRole = 'admin' | 'staff' | 'delivery' | 'distributor';
export type AppRole = UserRole;

export interface AuthUser {
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isSessionRestored: boolean;
  // Backward-compat aliases
  currentUser: AuthUser | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'vitalist_session';
const TOKEN_KEY = 'caffeineAdminToken';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronously restore session from sessionStorage before first render
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email && parsed?.role) return parsed as AuthUser;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  // Session is immediately restored synchronously via useState initializers
  const [isSessionRestored] = useState(true);

  // Get the actor for backend login calls
  const { actor } = useActor();

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (!actor) {
        throw new Error('System not ready. Please try again.');
      }

      // Call the backend login function with email and password directly
      const result = await actor.login(email.trim().toLowerCase(), password);

      if (!result) {
        return false;
      }

      const role = result.role as UserRole;
      const backendToken = result.token;

      // Derive a display name from the email (part before @)
      const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const authUser: AuthUser = { email: email.trim().toLowerCase(), role, name };

      // Atomically update state and sessionStorage
      setUser(authUser);
      setToken(backendToken);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      sessionStorage.setItem(TOKEN_KEY, backendToken);
      sessionStorage.setItem('userRole', role);
      sessionStorage.setItem('userEmail', email.trim().toLowerCase());

      return true;
    } catch (err: any) {
      console.error('[AuthContext] login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [actor]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userEmail');
  }, []);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isSessionRestored,
    // Backward-compat aliases
    currentUser: user,
    isAdmin: user?.role === 'admin',
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
