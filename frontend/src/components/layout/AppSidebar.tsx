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
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: Array<'admin' | 'staff' | 'delivery'>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['admin', 'staff', 'delivery'] },
  { id: 'stores', label: 'Stores', icon: <Store className="h-4 w-4" />, roles: ['admin'] },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { id: 'create-order', label: 'Create Order', icon: <ShoppingCart className="h-4 w-4" />, roles: ['staff'] },
  { id: 'invoices', label: 'Invoices', icon: <FileText className="h-4 w-4" />, roles: ['admin'] },
  { id: 'qr-management', label: 'QR Management', icon: <QrCode className="h-4 w-4" />, roles: ['admin'] },
  { id: 'scan', label: 'Scan QR', icon: <ScanLine className="h-4 w-4" />, roles: ['admin', 'staff'] },
  { id: 'delivery', label: 'My Deliveries', icon: <Truck className="h-4 w-4" />, roles: ['delivery'] },
  { id: 'delivery-scan', label: 'Scan QR', icon: <ScanLine className="h-4 w-4" />, roles: ['delivery'] },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, roles: ['admin'] },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, roles: ['admin', 'staff', 'delivery'] },
];

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role as 'admin' | 'staff' | 'delivery')
  );

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-aqua-500 flex items-center justify-center flex-shrink-0">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-none">VITALIST</p>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">WATER</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            role === 'admin' ? 'bg-green-400' :
            role === 'staff' ? 'bg-yellow-400' : 'bg-blue-400'
          }`} />
          <span className="text-xs font-medium text-sidebar-foreground/80 capitalize">{role}</span>
          <span className="text-xs text-sidebar-foreground/50 ml-auto truncate">{currentUser?.name}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-nav-item w-full text-left ${
              currentPage === item.id
                ? 'active'
                : 'text-sidebar-foreground/70'
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40 text-center">
          Vitalist Water © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
