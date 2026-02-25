import React, { useState } from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import DistributorWorkflowDialog from '../../components/distributor/DistributorWorkflowDialog';
import {
  useDistributorDeliveriesByUser,
  useAllOrders,
  useAllStores,
} from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { getStatusColor } from '../../utils/orderUtils';
import type { OrderRecord } from '../../backend';
import { Principal } from '@dfinity/principal';

export default function DistributorDashboard() {
  const { sessionEmail } = useAuth();
  const { identity } = useInternetIdentity();

  const [workflowOrder, setWorkflowOrder] = useState<OrderRecord | null>(null);

  const distributorPrincipal: Principal | null = React.useMemo(() => {
    if (!identity) return null;
    try {
      return identity.getPrincipal();
    } catch {
      return null;
    }
  }, [identity]);

  const { data: deliveries, isLoading: deliveriesLoading } = useDistributorDeliveriesByUser(
    distributorPrincipal,
    sessionEmail
  );

  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useAllOrders(sessionEmail);
  const { data: stores } = useAllStores(sessionEmail);

  const myOrders = React.useMemo(() => {
    if (!orders || !deliveries) return [];
    const myOrderIds = new Set(deliveries.map((d) => d.orderId));
    return orders.filter((o) => myOrderIds.has(o.orderId));
  }, [orders, deliveries]);

  const pendingConfirmationOrders = React.useMemo(() => {
    return myOrders.filter((o) => o.status === 'Distributor Confirmations Pending');
  }, [myOrders]);

  const getStoreName = (storeId: bigint): string => {
    if (!stores) return `Store #${String(storeId)}`;
    const idx = Number(storeId) - 1;
    return stores[idx]?.storeName ?? `Store #${String(storeId)}`;
  };

  const isLoading = deliveriesLoading || ordersLoading;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Distributor Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your delivery confirmations
        </p>
      </div>

      {!identity && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view your distributor assignments.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Confirmations */}
      {!isLoading && pendingConfirmationOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Pending Confirmations ({pendingConfirmationOrders.length})
          </h2>
          {pendingConfirmationOrders.map((order) => (
            <Card key={order.orderId} className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-mono font-medium">{order.orderId}</p>
                    <p className="text-sm text-muted-foreground">
                      {getStoreName(order.storeId)} | Qty: {String(order.quantity)}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setWorkflowOrder(order)}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Delivery
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All My Orders */}
      {!isLoading && myOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            My Orders ({myOrders.length})
          </h2>
          {myOrders.map((order) => (
            <Card key={order.orderId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-mono font-medium">{order.orderId}</p>
                    <p className="text-sm text-muted-foreground">
                      {getStoreName(order.storeId)} | Qty: {String(order.quantity)} | ₹{order.rate}
                    </p>
                  </div>
                  <Badge
                    variant={order.status === 'Delivered' ? 'outline' : 'secondary'}
                    className={order.status === 'Delivered' ? 'text-green-600 border-green-200' : ''}
                  >
                    {order.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && myOrders.length === 0 && identity && (
        <Card>
          <CardContent className="p-8 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No orders assigned</p>
            <p className="text-sm text-muted-foreground mt-1">
              Orders assigned to you will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Distributor Workflow Dialog */}
      <DistributorWorkflowDialog
        open={!!workflowOrder}
        order={workflowOrder}
        onClose={() => setWorkflowOrder(null)}
        onSuccess={() => {
          setWorkflowOrder(null);
          refetchOrders();
        }}
      />
    </div>
  );
}
