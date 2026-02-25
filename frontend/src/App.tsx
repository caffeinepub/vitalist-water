import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import { UserRole } from './backend';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';

// Admin pages
import StoreManagementPage from './pages/admin/StoreManagementPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import OrderManagementPage from './pages/admin/OrderManagementPage';
import QRManagementPage from './pages/admin/QRManagementPage';
import ReportsPage from './pages/admin/ReportsPage';
import DistributorDeliveryManagementPage from './pages/admin/DistributorDeliveryManagementPage';
import Dashboard from './pages/Dashboard';

// Staff pages
import OrderCreationPage from './pages/staff/OrderCreationPage';
import ScanPage from './pages/ScanPage';

// Delivery pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';

// Distributor pages
import DistributorDashboard from './pages/distributor/DistributorDashboard';

// Shared pages
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

// Role setup component: assigns the ICP role after II login
function RoleSetup({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const [roleAssigned, setRoleAssigned] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!user || !identity || !actor || actorFetching || assigning || roleAssigned) return;

    const assignRole = async () => {
      setAssigning(true);
      try {
        let icpRole: UserRole;
        if (user.role === 'admin') {
          icpRole = UserRole.admin;
        } else if (user.role === 'staff') {
          icpRole = UserRole.user;
        } else {
          icpRole = UserRole.guest;
        }

        const principal = identity.getPrincipal();
        await actor.assignCallerUserRole(principal, icpRole);
        setRoleAssigned(true);
      } catch (err) {
        // Role may already be assigned or assignment failed — mark done to avoid loops
        console.warn('Role assignment:', err);
        setRoleAssigned(true);
      } finally {
        setAssigning(false);
      }
    };

    assignRole();
  }, [user, identity, actor, actorFetching, roleAssigned, assigning]);

  // Reset role assignment when user changes
  useEffect(() => {
    setRoleAssigned(false);
  }, [user?.email]);

  return <>{children}</>;
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('');

  // Set default page based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setCurrentPage('stores');
      } else if (user.role === 'staff') {
        setCurrentPage('scan');
      } else if (user.role === 'delivery') {
        setCurrentPage('delivery');
      } else if (user.role === 'distributor') {
        setCurrentPage('distributor-dashboard');
      }
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    if (!user) return null;

    if (user.role === 'admin') {
      switch (currentPage) {
        case 'dashboard': return <Dashboard />;
        case 'stores': return <StoreManagementPage />;
        case 'orders': return <OrderManagementPage />;
        case 'invoices': return <OrderManagementPage />;
        case 'qr-management': return <QRManagementPage />;
        case 'scan': return <ScanPage role="admin" />;
        case 'reports': return <ReportsPage />;
        case 'users': return <UserManagementPage />;
        case 'distributor-deliveries': return <DistributorDeliveryManagementPage />;
        case 'settings': return <SettingsPage />;
        default: return <StoreManagementPage />;
      }
    }

    if (user.role === 'staff') {
      switch (currentPage) {
        case 'dashboard': return <Dashboard />;
        case 'orders': return <OrderManagementPage />;
        case 'create-order': return <OrderCreationPage />;
        case 'scan': return <ScanPage role="staff" />;
        case 'settings': return <SettingsPage />;
        default: return <ScanPage role="staff" />;
      }
    }

    if (user.role === 'delivery') {
      switch (currentPage) {
        case 'dashboard': return <DeliveryDashboard />;
        case 'delivery': return <DeliveryDashboard />;
        case 'delivery-scan': return <ScanPage role="delivery" />;
        case 'settings': return <SettingsPage />;
        default: return <DeliveryDashboard />;
      }
    }

    if (user.role === 'distributor') {
      switch (currentPage) {
        case 'distributor-dashboard': return <DistributorDashboard />;
        case 'settings': return <SettingsPage />;
        default: return <DistributorDashboard />;
      }
    }

    return null;
  };

  return (
    <RoleSetup>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </RoleSetup>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
