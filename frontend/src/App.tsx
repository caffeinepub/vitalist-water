import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Layout from './components/layout/Layout';
import StoreManagementPage from './pages/admin/StoreManagementPage';
import OrderManagementPage from './pages/admin/OrderManagementPage';
import QRManagementPage from './pages/admin/QRManagementPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import ReportsPage from './pages/admin/ReportsPage';
import OrderCreationPage from './pages/staff/OrderCreationPage';
import ScanPage from './pages/ScanPage';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { isAuthenticated, currentUser } = useAuth();
  const role = currentUser?.role;

  // Default page per role
  const getDefaultPage = () => {
    if (role === 'delivery') return 'delivery';
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState<string>(getDefaultPage());

  // When auth state changes, reset to default page
  React.useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage(getDefaultPage());
    }
  }, [isAuthenticated, role]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    // Admin pages
    if (role === 'admin') {
      switch (currentPage) {
        case 'dashboard': return <Dashboard />;
        case 'stores': return <StoreManagementPage />;
        case 'orders': return <OrderManagementPage />;
        case 'invoices': return <OrderManagementPage />;
        case 'qr-management': return <QRManagementPage />;
        case 'scan': return <ScanPage role="admin" />;
        case 'reports': return <ReportsPage />;
        case 'users': return <UserManagementPage />;
        case 'settings': return <SettingsPage />;
        default: return <Dashboard />;
      }
    }

    // Staff pages
    if (role === 'staff') {
      switch (currentPage) {
        case 'dashboard': return <Dashboard />;
        case 'orders': return <OrderManagementPage />;
        case 'create-order': return <OrderCreationPage />;
        case 'scan': return <ScanPage role="staff" />;
        case 'settings': return <SettingsPage />;
        default: return <Dashboard />;
      }
    }

    // Delivery pages
    if (role === 'delivery') {
      switch (currentPage) {
        case 'dashboard': return <DeliveryDashboard />;
        case 'delivery': return <DeliveryDashboard />;
        case 'delivery-scan': return <ScanPage role="delivery" />;
        case 'settings': return <SettingsPage />;
        default: return <DeliveryDashboard />;
      }
    }

    return <Dashboard />;
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
