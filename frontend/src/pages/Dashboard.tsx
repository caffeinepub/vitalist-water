import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminDashboardStats, useAllOrders } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart,
  Truck,
  CheckCircle,
  Clock,
  Package,
  AlertCircle,
} from 'lucide-react';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

function StatCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ onNavigate: _onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const role = user?.role ?? '';

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useAdminDashboardStats(email, role === 'admin');

  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useAllOrders(email);

  const recentOrders = React.useMemo(() => {
    if (!orders) return [];
    return [...orders]
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 5);
  }, [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'text-green-600 bg-green-50';
      case 'Out for Delivery': return 'text-blue-600 bg-blue-50';
      case 'Pending Approval': return 'text-yellow-600 bg-yellow-50';
      case 'Approved': return 'text-purple-600 bg-purple-50';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's what's happening with your orders today.
        </p>
      </div>

      {statsError && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">Could not load dashboard stats.</p>
        </div>
      )}

      {role === 'admin' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Orders Today"
            value={stats ? Number(stats.totalOrdersToday) : 0}
            icon={<ShoppingCart className="h-4 w-4" />}
            loading={statsLoading}
          />
          <StatCard
            title="Active Deliveries"
            value={stats ? Number(stats.activeDeliveries) : 0}
            icon={<Truck className="h-4 w-4" />}
            loading={statsLoading}
          />
          <StatCard
            title="In Transit"
            value={stats ? Number(stats.trucksInTransit) : 0}
            icon={<Package className="h-4 w-4" />}
            loading={statsLoading}
          />
          <StatCard
            title="Delivered Today"
            value={stats ? Number(stats.deliveredToday) : 0}
            icon={<CheckCircle className="h-4 w-4" />}
            loading={statsLoading}
          />
          <StatCard
            title="Pending Approval"
            value={stats ? Number(stats.pendingApproval) : 0}
            icon={<Clock className="h-4 w-4" />}
            loading={statsLoading}
          />
          <StatCard
            title="Confirmations"
            value={stats ? Number(stats.confirmationsPending) : 0}
            icon={<AlertCircle className="h-4 w-4" />}
            loading={statsLoading}
          />
        </div>
      )}

      {/* Recent Orders */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Orders</h2>
        {ordersError && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">Could not load orders.</p>
          </div>
        )}
        {ordersLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Card key={order.orderId} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">{order.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {Number(order.quantity)} · Rate: ₹{order.rate}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
