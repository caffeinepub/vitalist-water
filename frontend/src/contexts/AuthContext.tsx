import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';

export type AppRole = 'admin' | 'staff' | 'delivery' | 'distributor';

export interface AuthUser {
  email: string;
  role: AppRole;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  /** Alias for user — kept for backward compatibility */
  currentUser: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isDelivery: boolean;
  isDistributor: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: Record<string, { password: string; role: AppRole; name: string }> = {
  'shajan@vitalist.com': { password: 'India@123', role: 'admin', name: 'Shajan' },
  'admin@vitalist.com': { password: 'admin123', role: 'admin', name: 'Admin User' },
  'staff@vitalist.com': { password: 'staff123', role: 'staff', name: 'Staff User' },
  'delivery@vitalist.com': { password: 'delivery123', role: 'delivery', name: 'Delivery User' },
};

const SESSION_KEY = 'vitalist_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { login: iiLogin, clear: iiClear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  // Restore session on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const normalizedEmail = email.toLowerCase().trim();
      const demo = DEMO_USERS[normalizedEmail];
      if (!demo || demo.password !== password) {
        return false;
      }

      const authUser: AuthUser = {
        email: normalizedEmail,
        role: demo.role,
        name: demo.name,
      };

      // Trigger Internet Identity login to get a real principal for backend calls
      if (!identity) {
        try {
          await iiLogin();
        } catch (err) {
          // II login failed or was cancelled — continue anyway
          console.warn('Internet Identity login issue:', err);
        }
      }

      setUser(authUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      return true;
    },
    [identity, iiLogin]
  );

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
    queryClient.clear();
    // iiClear returns void, not a Promise — call it directly
    try {
      iiClear();
    } catch {
      // ignore
    }
  }, [iiClear, queryClient]);

  const value: AuthContextType = {
    user,
    currentUser: user, // backward-compat alias
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff',
    isDelivery: user?.role === 'delivery',
    isDistributor: user?.role === 'distributor',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
