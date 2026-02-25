import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type AppRole = 'admin' | 'staff' | 'delivery' | null;

export interface AuthUser {
  email: string;
  role: AppRole;
  name: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isDelivery: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials - these match the backend pre-seeded users
const DEMO_CREDENTIALS: Record<string, { password: string; role: AppRole; name: string }> = {
  'admin@vitalist.com': { password: 'India@123', role: 'admin', name: 'Admin User' },
  'staff@vitalist.com': { password: 'India@123', role: 'staff', name: 'Staff User' },
  'delivery@vitalist.com': { password: 'India@123', role: 'delivery', name: 'Delivery User' },
};

const SESSION_KEY = 'vitalist_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        setCurrentUser(user);
      }
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const cred = DEMO_CREDENTIALS[email.toLowerCase()];
    if (!cred || cred.password !== password) {
      return false;
    }
    const user: AuthUser = { email: email.toLowerCase(), role: cred.role, name: cred.name };
    setCurrentUser(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return true;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    isStaff: currentUser?.role === 'staff',
    isDelivery: currentUser?.role === 'delivery',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
