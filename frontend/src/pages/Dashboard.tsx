import React from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboardStats, useAllOrders } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { getStatusColor } from '../utils/orderUtils';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate: _onNavigate }: DashboardProps) {
  const { user, sessionEmail } = useAuth();
  const email = sessionEmail;
  const role = user?.role ?? 'staff';

  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats(email);
  const { data: orders, isLoading: ordersLoading } = useAllOrders(email);

  const recentOrders = React.useMemo(() => {
    if (!orders) return [];
    return [...orders]
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 5);
  }, [orders]);

  const statCards = [
    {
      title: 'Orders Today',
      value: stats ? String(stats.totalOrdersToday) : '—',
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Active Deliveries',
      value: stats ? String(stats.activeDeliveries) : '—',
      icon: Truck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Delivered Today',
      value: stats ? String(stats.deliveredToday) : '—',
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Pending Approval',
      value: stats ? String(stats.pendingApproval) : '—',
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Trucks in Transit',
      value: stats ? String(stats.trucksInTransit) : '—',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Confirmations Pending',
      value: stats ? String(stats.confirmationsPending) : '—',
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">
          {role} Dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    {statsLoading ? (
                      <Skeleton className="h-6 w-12 mb-1" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{order.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {String(order.quantity)} | ₹{order.rate}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
