import React from 'react';
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  FileText,
  QrCode,
  BarChart3,
  Settings,
  Users,
  Droplets,
  ScanLine,
  Truck,
  Package,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { AppRole } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['admin', 'staff', 'delivery'] },
  { id: 'stores', label: 'Stores', icon: <Store className="h-4 w-4" />, roles: ['admin'] },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { id: 'create-order', label: 'Create Order', icon: <ShoppingCart className="h-4 w-4" />, roles: ['staff'] },
  { id: 'invoices', label: 'Invoices', icon: <FileText className="h-4 w-4" />, roles: ['admin'] },
  { id: 'qr-management', label: 'QR Management', icon: <QrCode className="h-4 w-4" />, roles: ['admin'] },
  { id: 'scan', label: 'Scan QR', icon: <ScanLine className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { id: 'distributor-deliveries', label: 'Distributor Deliveries', icon: <Package className="h-4 w-4" />, roles: ['admin'] },
  { id: 'delivery', label: 'My Deliveries', icon: <Truck className="h-4 w-4" />, roles: ['delivery'] },
  { id: 'delivery-scan', label: 'Scan QR', icon: <ScanLine className="h-4 w-4" />, roles: ['delivery'] },
  { id: 'distributor-dashboard', label: 'My Deliveries', icon: <Truck className="h-4 w-4" />, roles: ['distributor'] },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, roles: ['admin'] },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, roles: ['admin', 'staff', 'delivery', 'distributor'] },
];

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { user } = useAuth();
  const role = user?.role as AppRole | undefined;

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role)
  );

  const roleDotColor =
    role === 'admin' ? 'bg-green-400' :
    role === 'staff' ? 'bg-yellow-400' :
    role === 'distributor' ? 'bg-purple-400' :
    'bg-blue-400';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-none">VITALIST</p>
          <p className="text-xs text-sidebar-foreground mt-0.5 opacity-60">WATER</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className={`w-2 h-2 rounded-full shrink-0 ${roleDotColor}`} />
          <span className="text-xs font-medium text-sidebar-foreground capitalize">{role}</span>
          <span className="text-xs text-sidebar-foreground opacity-50 ml-auto truncate">{user?.name}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-nav-item w-full text-left ${
              currentPage === item.id ? 'active' : ''
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground opacity-40 text-center">
          Vitalist Water © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
