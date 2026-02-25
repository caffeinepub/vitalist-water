import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useActor } from '../hooks/useActor';

export type AppRole = 'admin' | 'staff' | 'delivery' | 'distributor';

interface AuthUser {
  email: string;
  role: AppRole;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  // backward-compat aliases
  currentUser: AuthUser | null;
  isAdmin: boolean;
  isStaff: boolean;
  isDelivery: boolean;
  isDistributor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'vitalist_session';

function safeGetSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email && parsed.role && parsed.token) {
      return parsed as AuthUser;
    }
    return null;
  } catch {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

function safeSaveSession(user: AuthUser): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
}

function safeClearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { actor, isFetching: actorFetching } = useActor();

  // Restore session on mount
  useEffect(() => {
    const restored = safeGetSession();
    if (restored) {
      setUser(restored);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!actor) return false;
    try {
      setIsLoading(true);
      const result = await actor.login(email, password);
      if (result && result.role) {
        const role = result.role as AppRole;
        const authUser: AuthUser = {
          email,
          role,
          token: result.token,
        };
        setUser(authUser);
        safeSaveSession(authUser);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    safeClearSession();
  };

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isDelivery = user?.role === 'delivery';
  const isDistributor = user?.role === 'distributor';

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading: isLoading || actorFetching,
    isAuthenticated,
    // backward-compat aliases
    currentUser: user,
    isAdmin,
    isStaff,
    isDelivery,
    isDistributor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
