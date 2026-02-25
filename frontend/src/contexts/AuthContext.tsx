import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useActor } from '../hooks/useActor';

export interface AuthUser {
  email: string;
  role: 'admin' | 'staff' | 'delivery' | 'distributor';
  token: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  sessionEmail: string;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { actor } = useActor();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('auth_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
      } catch {
        sessionStorage.removeItem('auth_user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!actor) {
      setError('System not ready. Please try again.');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await actor.login(email, password);
      if (result) {
        const authUser: AuthUser = {
          email,
          role: result.role as AuthUser['role'],
          token: result.token,
        };
        setUser(authUser);
        sessionStorage.setItem('auth_user', JSON.stringify(authUser));
        return true;
      } else {
        setError('Invalid email or password.');
        return false;
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('auth_user');
  };

  const sessionEmail = user?.email ?? '';

  return (
    <AuthContext.Provider value={{ user, sessionEmail, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
