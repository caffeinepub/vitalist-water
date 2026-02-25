import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/layout/Layout';

// Admin pages
import StoreManagementPage from './pages/admin/StoreManagementPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import OrderManagementPage from './pages/admin/OrderManagementPage';
import QRManagementPage from './pages/admin/QRManagementPage';
import ReportsPage from './pages/admin/ReportsPage';
import DistributorDeliveryManagementPage from './pages/admin/DistributorDeliveryManagementPage';

// Staff pages
import OrderCreationPage from './pages/staff/OrderCreationPage';
import ScanPage from './pages/ScanPage';

// Delivery pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';

// Distributor pages
import DistributorDashboard from './pages/distributor/DistributorDashboard';

// Shared pages
import SettingsPage from './pages/SettingsPage';
import Dashboard from './pages/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppContent() {
  const { user, isSessionRestored } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('');

  // Set default page based on role when user changes
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') setCurrentPage('stores');
      else if (user.role === 'staff') setCurrentPage('scan');
      else if (user.role === 'delivery') setCurrentPage('delivery');
      else if (user.role === 'distributor') setCurrentPage('distributor-dashboard');
    }
  }, [user?.role]);

  if (!isSessionRestored) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
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
        case 'dashboard': return <Dashboard />;
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
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
