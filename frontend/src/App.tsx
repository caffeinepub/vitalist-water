import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { Loader2 } from 'lucide-react';

// Lazy-load heavy pages
const OrderManagementPage = React.lazy(() => import('./pages/admin/OrderManagementPage'));
const StoreManagementPage = React.lazy(() => import('./pages/admin/StoreManagementPage'));
const UserManagementPage = React.lazy(() => import('./pages/admin/UserManagementPage'));
const ReportsPage = React.lazy(() => import('./pages/admin/ReportsPage'));
const QRManagementPage = React.lazy(() => import('./pages/admin/QRManagementPage'));
const LiveTrackingPage = React.lazy(() => import('./pages/admin/LiveTrackingPage'));
const DeliveryVerificationPage = React.lazy(() => import('./pages/admin/DeliveryVerificationPage'));
const DistributorDeliveryManagementPage = React.lazy(
  () => import('./pages/admin/DistributorDeliveryManagementPage'),
);
const OrderCreationPage = React.lazy(() => import('./pages/staff/OrderCreationPage'));
const DeliveryDashboard = React.lazy(() => import('./pages/delivery/DeliveryDashboard'));
const DistributorDashboard = React.lazy(() => import('./pages/distributor/DistributorDashboard'));
const ScanPage = React.lazy(() => import('./pages/ScanPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    </div>
  );
}

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

function isPage(value: string): value is Page {
  return [
    'dashboard', 'orders', 'stores', 'users', 'reports', 'qr',
    'live-tracking', 'delivery-verification', 'distributor-deliveries',
    'order-creation', 'delivery-dashboard', 'distributor-dashboard',
    'scan', 'settings',
  ].includes(value);
}

function getDefaultPageForRole(role: string): Page {
  switch (role) {
    case 'admin': return 'dashboard';
    case 'staff': return 'order-creation';
    case 'delivery': return 'delivery-dashboard';
    case 'distributor': return 'distributor-dashboard';
    default: return 'dashboard';
  }
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');

  const role = user?.role ?? '';

  // navigate accepts string (for Dashboard compatibility) but validates before setting
  const navigate = (page: string) => {
    if (isPage(page)) {
      setCurrentPage(page);
    }
  };

  // Redirect to role-appropriate default page — must be called unconditionally (before any early returns)
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (currentPage === 'dashboard' && role !== 'admin') {
      setCurrentPage(getDefaultPageForRole(role));
    }
  }, [role, isAuthenticated, user, currentPage]);

  // Show loading while auth is initializing
  if (isLoading) {
    return <PageLoader />;
  }

  // Show login if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    const adminPages: Page[] = [
      'orders', 'stores', 'users', 'reports', 'qr',
      'live-tracking', 'delivery-verification', 'distributor-deliveries',
    ];

    if (role !== 'admin' && adminPages.includes(currentPage)) {
      return <Dashboard onNavigate={navigate} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'orders':
        return role === 'admin' ? <OrderManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'stores':
        return role === 'admin' ? <StoreManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'users':
        return role === 'admin' ? <UserManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'reports':
        return role === 'admin' ? <ReportsPage /> : <Dashboard onNavigate={navigate} />;
      case 'qr':
        return role === 'admin' ? <QRManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'live-tracking':
        return role === 'admin' ? <LiveTrackingPage /> : <Dashboard onNavigate={navigate} />;
      case 'delivery-verification':
        return role === 'admin' ? (
          <DeliveryVerificationPage />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      case 'distributor-deliveries':
        return role === 'admin' ? (
          <DistributorDeliveryManagementPage />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      case 'order-creation':
        return role === 'staff' || role === 'admin' ? (
          <OrderCreationPage />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      case 'delivery-dashboard':
        return role === 'delivery' || role === 'admin' ? (
          <DeliveryDashboard />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      case 'distributor-dashboard':
        return role === 'distributor' || role === 'admin' ? (
          <DistributorDashboard />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      case 'scan':
        return role === 'admin' || role === 'staff' || role === 'delivery' ? (
          <ScanPage role={role as 'admin' | 'staff' | 'delivery'} />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebarWrapper role={role} currentPage={currentPage} onNavigate={navigate} />
      <main className="flex-1 overflow-auto">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>{renderPage()}</Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

// Lazy-load sidebar
const AppSidebar = React.lazy(() => import('./components/layout/AppSidebar'));

function AppSidebarWrapper({
  role,
  currentPage,
  onNavigate,
}: {
  role: string;
  currentPage: Page;
  onNavigate: (page: string) => void;
}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="w-64 bg-sidebar shrink-0" />}>
        <AppSidebar role={role} currentPage={currentPage} onNavigate={onNavigate} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
