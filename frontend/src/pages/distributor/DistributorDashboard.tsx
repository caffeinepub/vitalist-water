import React from 'react';
import { toast } from 'sonner';
import { Truck, Phone, User, Calendar, Package, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import {
  useDistributorDeliveriesByUser,
  useAllOrders,
  useAllStores,
  useUpdateDistributorDelivery,
} from '../../hooks/useQueries';
import type { DistributorDelivery } from '../../backend';

function formatDateTime(timestamp: bigint): string {
  try {
    const ms = Number(timestamp) / 1_000_000;
    return new Date(ms).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved': return 'default';
    case 'pending': return 'secondary';
    case 'delivered': return 'outline';
    case 'cancelled': return 'destructive';
    case 'truck_arrived': return 'default';
    default: return 'secondary';
  }
}

function DeliveryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-9 w-full mt-2" />
      </CardContent>
    </Card>
  );
}

interface DeliveryCardProps {
  delivery: DistributorDelivery;
  orderStatus: string;
  storeName: string;
  onMarkArrived: (delivery: DistributorDelivery) => void;
  isUpdating: boolean;
}

function DeliveryCard({ delivery, orderStatus, storeName, onMarkArrived, isUpdating }: DeliveryCardProps) {
  const isTruckArrived = orderStatus === 'truck_arrived' || orderStatus === 'delivered' || delivery.notes.includes('TRUCK_ARRIVED');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Order: <span className="font-mono text-primary">{delivery.orderId}</span>
            </CardTitle>
            {storeName && (
              <p className="text-sm text-muted-foreground mt-0.5">{storeName}</p>
            )}
          </div>
          <Badge variant={getStatusBadgeVariant(orderStatus)} className="capitalize shrink-0">
            {orderStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="w-4 h-4 shrink-0 text-primary" />
            <span className="font-medium text-foreground">{delivery.truckNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4 shrink-0" />
            <span>{delivery.driverName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            <a href={`tel:${delivery.driverContact}`} className="hover:text-primary transition-colors">
              {delivery.driverContact}
            </a>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="text-xs">{formatDateTime(delivery.estimatedDeliveryTime)}</span>
          </div>
        </div>

        {delivery.notes && (
          <div className="p-2 rounded-md bg-muted text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Note: </span>
            {delivery.notes}
          </div>
        )}

        <div className="pt-1">
          {isTruckArrived ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              Truck Arrived / Delivered
            </div>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={() => onMarkArrived(delivery)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isUpdating ? 'Updating...' : 'Mark Truck Arrived'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DistributorDashboard() {
  const { user } = useAuth();
  // Distributor dashboard uses principal-based lookup; pass undefined to get empty list
  // since this app uses email/password auth (not Internet Identity principals)
  const { data: deliveries = [], isLoading: deliveriesLoading, refetch } = useDistributorDeliveriesByUser(undefined);
  const { data: orders = [] } = useAllOrders();
  const { data: stores = [] } = useAllStores();
  const updateDelivery = useUpdateDistributorDelivery();

  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const getOrderStatus = (orderId: string): string => {
    const order = orders.find((o) => o.orderId === orderId);
    return order?.status || 'unknown';
  };

  const getStoreName = (orderId: string): string => {
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) return '';
    const store = stores.find((_s, idx) => BigInt(idx + 1) === order.storeId);
    return store?.storeName || '';
  };

  const handleMarkArrived = async (delivery: DistributorDelivery) => {
    setUpdatingId(delivery.deliveryId);
    try {
      const updatedDelivery: DistributorDelivery = {
        ...delivery,
        notes: delivery.notes ? `${delivery.notes} | TRUCK_ARRIVED` : 'TRUCK_ARRIVED',
      };
      await updateDelivery.mutateAsync({ deliveryId: delivery.deliveryId, delivery: updatedDelivery });
      toast.success('Truck arrival marked successfully!');
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Deliveries</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome, {user?.name || 'Distributor'} — track your assigned deliveries
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deliveries.length}</p>
                <p className="text-xs text-muted-foreground">Total Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {deliveries.filter((d) => d.notes.includes('TRUCK_ARRIVED')).length}
                </p>
                <p className="text-xs text-muted-foreground">Arrived</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {deliveries.filter((d) => !d.notes.includes('TRUCK_ARRIVED')).length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries */}
      {deliveriesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <DeliveryCardSkeleton key={i} />)}
        </div>
      ) : deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No deliveries assigned</p>
            <p className="text-sm text-muted-foreground mt-1">
              Deliveries assigned to you will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.deliveryId}
              delivery={delivery}
              orderStatus={getOrderStatus(delivery.orderId)}
              storeName={getStoreName(delivery.orderId)}
              onMarkArrived={handleMarkArrived}
              isUpdating={updatingId === delivery.deliveryId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
