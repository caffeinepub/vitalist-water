import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield, Info, Droplets, Heart } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    staff: 'Staff',
    delivery: 'Delivery',
    distributor: 'Distributor',
  };

  const displayName = user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Account information and system settings</p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card card-shadow p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Account Information
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium text-foreground">{displayName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              user?.role === 'admin'
                ? 'bg-green-100 text-green-800 border-green-200'
                : user?.role === 'staff'
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}>
              <Shield className="h-3 w-3" />
              {roleLabels[user?.role ?? ''] ?? user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="rounded-xl border border-border bg-card card-shadow p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          System Information
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Application</span>
            <span className="text-sm font-medium text-foreground">Vitalist Water OMS</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium text-foreground">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Platform</span>
            <span className="text-sm font-medium text-foreground">Internet Computer</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <h3 className="font-semibold text-foreground mb-2">Sign Out</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You will be returned to the login screen. Your session data will be cleared.
        </p>
        <Button variant="destructive" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Footer attribution */}
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Droplets className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">VITALIST WATER</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Order &amp; Delivery Management System © {new Date().getFullYear()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Built with{' '}
          <Heart className="inline h-3 w-3 text-red-500" />{' '}
          using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
