import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Users,
  BarChart3,
  QrCode,
  MapPin,
  CheckSquare,
  Truck,
  PackagePlus,
  Navigation,
  Package,
  ScanLine,
  Settings,
  LogOut,
  Droplets,
} from 'lucide-react';

type Page =
  | 'dashboard'
  | 'orders'
  | 'stores'
  | 'users'
  | 'reports'
  | 'qr'
  | 'live-tracking'
  | 'delivery-verification'
  | 'distributor-deliveries'
  | 'order-creation'
  | 'delivery-dashboard'
  | 'distributor-dashboard'
  | 'scan'
  | 'settings';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

interface AppSidebarProps {
  role: string;
  currentPage: string;
  onNavigate: (page: string) => void;
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case 'admin':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'orders', label: 'Order Management', icon: <ShoppingCart className="h-4 w-4" /> },
        { id: 'stores', label: 'Store Management', icon: <Store className="h-4 w-4" /> },
        { id: 'users', label: 'User Management', icon: <Users className="h-4 w-4" /> },
        { id: 'distributor-deliveries', label: 'Distributor Deliveries', icon: <Truck className="h-4 w-4" /> },
        { id: 'delivery-verification', label: 'Delivery Verification', icon: <CheckSquare className="h-4 w-4" /> },
        { id: 'live-tracking', label: 'Live Tracking', icon: <MapPin className="h-4 w-4" /> },
        { id: 'qr', label: 'QR Management', icon: <QrCode className="h-4 w-4" /> },
        { id: 'reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
        { id: 'scan', label: 'Scan QR', icon: <ScanLine className="h-4 w-4" /> },
      ];
    case 'staff':
      return [
        { id: 'order-creation', label: 'Create Order', icon: <PackagePlus className="h-4 w-4" /> },
        { id: 'scan', label: 'Scan QR', icon: <ScanLine className="h-4 w-4" /> },
      ];
    case 'delivery':
      return [
        { id: 'delivery-dashboard', label: 'My Deliveries', icon: <Navigation className="h-4 w-4" /> },
        { id: 'scan', label: 'Scan QR', icon: <ScanLine className="h-4 w-4" /> },
      ];
    case 'distributor':
      return [
        { id: 'distributor-dashboard', label: 'My Deliveries', icon: <Package className="h-4 w-4" /> },
      ];
    default:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      ];
  }
}

export default function AppSidebar({ role, currentPage, onNavigate }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const navItems = getNavItems(role);

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'admin': return 'Administrator';
      case 'staff': return 'Staff';
      case 'delivery': return 'Delivery Agent';
      case 'distributor': return 'Distributor';
      default: return r;
    }
  };

  return (
    <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sidebar-foreground text-sm leading-tight truncate">Vitalist Water</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">Order &amp; Delivery</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
              currentPage === item.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => onNavigate('settings')}
          className={`sidebar-nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
            currentPage === 'settings'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span className="truncate">Settings</span>
        </button>

        {/* User info */}
        <div className="px-3 py-2 rounded-lg bg-sidebar-accent/30">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email ?? ''}</p>
          <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(role)}</p>
        </div>

        <button
          onClick={logout}
          className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
