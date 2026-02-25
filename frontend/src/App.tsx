import React, { useState, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Admin pages
const OrderManagementPage = lazy(() => import('./pages/admin/OrderManagementPage'));
const StoreManagementPage = lazy(() => import('./pages/admin/StoreManagementPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const QRManagementPage = lazy(() => import('./pages/admin/QRManagementPage'));
const LiveTrackingPage = lazy(() => import('./pages/admin/LiveTrackingPage'));
const DeliveryVerificationPage = lazy(() => import('./pages/admin/DeliveryVerificationPage'));
const DistributorDeliveryManagementPage = lazy(
  () => import('./pages/admin/DistributorDeliveryManagementPage')
);

// Staff pages
const OrderCreationPage = lazy(() => import('./pages/staff/OrderCreationPage'));

// Delivery pages
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));

// Distributor pages
const DistributorDashboard = lazy(() => import('./pages/distributor/DistributorDashboard'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user) {
    return <LoginPage />;
  }

  const role = user.role;

  const navigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'scan':
        return <ScanPage />;
      case 'settings':
        return <SettingsPage />;

      // Admin pages
      case 'orders':
        return role === 'admin' ? <OrderManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'stores':
        return role === 'admin' ? <StoreManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'users':
        return role === 'admin' ? <UserManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'reports':
        return role === 'admin' ? <ReportsPage /> : <Dashboard onNavigate={navigate} />;
      case 'qr-management':
        return role === 'admin' ? <QRManagementPage /> : <Dashboard onNavigate={navigate} />;
      case 'live-tracking':
        return role === 'admin' ? <LiveTrackingPage /> : <Dashboard onNavigate={navigate} />;
      case 'delivery-verification':
        return role === 'admin' ? <DeliveryVerificationPage /> : <Dashboard onNavigate={navigate} />;
      case 'distributor-deliveries':
        return role === 'admin' ? (
          <DistributorDeliveryManagementPage />
        ) : (
          <Dashboard onNavigate={navigate} />
        );

      // Staff pages
      case 'create-order':
        return role === 'staff' || role === 'admin' ? (
          <OrderCreationPage />
        ) : (
          <Dashboard onNavigate={navigate} />
        );

      // Delivery pages
      case 'delivery-dashboard':
        return role === 'delivery' || role === 'admin' ? (
          <DeliveryDashboard />
        ) : (
          <Dashboard onNavigate={navigate} />
        );

      // Distributor pages
      case 'distributor-dashboard':
        return role === 'distributor' || role === 'admin' ? (
          <DistributorDashboard />
        ) : (
          <Dashboard onNavigate={navigate} />
        );

      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        {renderPage()}
      </Suspense>
    </Layout>
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
