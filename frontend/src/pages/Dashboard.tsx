import React, { useMemo } from 'react';
import { useAllOrders } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/orders/StatusBadge';
import { ShoppingCart, Clock, Package, Truck, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { parseOrderMeta } from '../utils/orderUtils';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { data: orders = [], isLoading } = useAllOrders();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => {
      const ts = Number(o.timestamp) / 1_000_000;
      return new Date(ts) >= today;
    });

    return {
      todayTotal: todayOrders.length,
      pending: orders.filter((o) => o.status === 'Pending Approval').length,
      approved: orders.filter((o) => o.status === 'Approved').length,
      ready: orders.filter((o) => o.status === 'Ready').length,
      dispatched: orders.filter((o) => o.status === 'Dispatched').length,
      outForDelivery: orders.filter((o) => o.status === 'Out for Delivery').length,
      delivered: orders.filter((o) => o.status === 'Delivered').length,
      cancelled: orders.filter((o) => o.status === 'Cancelled').length,
      total: orders.length,
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 5);
  }, [orders]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {currentUser?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Today's Orders" count={stats.todayTotal} icon={Calendar} color="blue" />
        <StatCard label="Pending Approval" count={stats.pending} icon={Clock} color="amber" />
        <StatCard label="Ready to Ship" count={stats.ready} icon={Package} color="teal" />
        <StatCard label="Out for Delivery" count={stats.outForDelivery} icon={Truck} color="orange" />
        <StatCard label="Delivered" count={stats.delivered} icon={CheckCircle} color="green" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground font-medium">Approved</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">{stats.approved}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground font-medium">Dispatched</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.dispatched}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground font-medium">Cancelled</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{stats.cancelled}</p>
        </div>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Orders
            </h3>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => {
              const { userNotes } = parseOrderMeta(order.notes);
              return (
                <div key={order.orderId} className="px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground font-mono">{order.orderId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(Number(order.timestamp) / 1_000_000).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground hidden sm:block">
                      Qty: {order.quantity.toString()}
                    </span>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
