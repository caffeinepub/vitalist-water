import React, { useMemo } from 'react';
import { useAllOrders, useAllStores } from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, TrendingUp, Package, CheckCircle, Clock, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsPage() {
  const { user } = useAuth();
  const sessionEmail = user?.email ?? '';

  const { data: orders = [], isLoading } = useAllOrders(sessionEmail);
  const { data: stores = [] } = useAllStores(sessionEmail);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const getTs = (o: { timestamp: bigint }) => Number(o.timestamp) / 1_000_000;

    const todayOrders = orders.filter((o) => new Date(getTs(o)) >= today);
    const weekOrders = orders.filter((o) => new Date(getTs(o)) >= weekAgo);
    const monthOrders = orders.filter((o) => new Date(getTs(o)) >= monthAgo);

    const deliveredOrders = orders.filter((o) => o.status === 'Delivered');

    const storeOrderCounts: Record<string, number> = {};
    for (const o of orders) {
      const idx = Number(o.storeId) - 1;
      const name = stores[idx]?.storeName ?? `Store #${o.storeId}`;
      storeOrderCounts[name] = (storeOrderCounts[name] ?? 0) + 1;
    }

    const topStores = Object.entries(storeOrderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    }

    return {
      todayCount: todayOrders.length,
      weekCount: weekOrders.length,
      monthCount: monthOrders.length,
      totalCount: orders.length,
      deliveredCount: deliveredOrders.length,
      totalQuantity: orders.reduce((sum, o) => sum + Number(o.quantity), 0),
      topStores,
      statusCounts,
    };
  }, [orders, stores]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Pending Approval': 'bg-amber-400',
    'Approved': 'bg-sky-400',
    'Ready': 'bg-teal-400',
    'Dispatched': 'bg-blue-400',
    'Out for Delivery': 'bg-orange-400',
    'Delivered': 'bg-green-400',
    'Cancelled': 'bg-red-400',
  };

  const maxStatusCount = Math.max(...Object.values(stats.statusCounts), 1);
  const maxStoreCount = Math.max(...stats.topStores.map((s) => s[1]), 1);

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports &amp; Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of order activity and delivery performance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-muted-foreground font-medium">Today</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.todayCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">orders placed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-muted-foreground font-medium">This Week</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.weekCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">orders placed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-muted-foreground font-medium">This Month</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.monthCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">orders placed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-xs text-muted-foreground font-medium">Delivered</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.deliveredCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {stats.totalCount} total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="rounded-xl border border-border bg-card card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Order Status Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{status}</span>
                  <span className="text-muted-foreground font-mono">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${statusColors[status] ?? 'bg-gray-400'}`}
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(stats.statusCounts).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No order data available</p>
            )}
          </div>
        </div>

        {/* Top stores */}
        <div className="rounded-xl border border-border bg-card card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Top Stores by Orders
          </h3>
          <div className="space-y-3">
            {stats.topStores.map(([storeName, count], idx) => (
              <div key={storeName} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-foreground font-medium truncate max-w-[160px]">{storeName}</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${(count / maxStoreCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.topStores.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No store data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Total quantity */}
      <div className="rounded-xl border border-border bg-card card-shadow p-5">
        <h3 className="font-semibold text-foreground mb-3">Overall Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Units Ordered</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalQuantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Delivery Rate</p>
            <p className="text-xl font-bold text-green-600 mt-0.5">
              {stats.totalCount > 0 ? Math.round((stats.deliveredCount / stats.totalCount) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
