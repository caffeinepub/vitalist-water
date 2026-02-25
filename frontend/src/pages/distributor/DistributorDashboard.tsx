import React, { useState } from 'react';
import { useDistributorDeliveriesByUser, useAllOrders, useAllStores } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Lock,
  Package,
} from 'lucide-react';
import { isOrderLocked } from '@/utils/orderUtils';
import DistributorWorkflowDialog from '@/components/distributor/DistributorWorkflowDialog';

export default function DistributorDashboard() {
  const { user } = useAuth();
  const sessionEmail = user?.email ?? '';

  // For distributors, we pass null as principal (session-based auth)
  const { data: deliveries, isLoading: deliveriesLoading } = useDistributorDeliveriesByUser(null, sessionEmail);
  const { data: orders, isLoading: ordersLoading } = useAllOrders(sessionEmail);
  const { data: stores } = useAllStores(sessionEmail);

  const [workflowOrderId, setWorkflowOrderId] = useState<string | null>(null);
  const [workflowDeliveryId, setWorkflowDeliveryId] = useState<string | null>(null);

  const isLoading = deliveriesLoading || ordersLoading;

  const getOrder = (orderId: string) => orders?.find((o) => o.orderId === orderId);
  const getStore = (storeId: bigint) => {
    const id = Number(storeId);
    return stores?.[id - 1];
  };

  const handleMarkArrived = (orderId: string, deliveryId: string) => {
    setWorkflowOrderId(orderId);
    setWorkflowDeliveryId(deliveryId);
  };

  const handleWorkflowSuccess = () => {
    setWorkflowOrderId(null);
    setWorkflowDeliveryId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Deliveries</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and confirm your assigned deliveries
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : !deliveries || deliveries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Package className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No deliveries assigned to you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => {
            const order = getOrder(delivery.orderId);
            const store = order ? getStore(order.storeId) : null;
            const locked = order ? isOrderLocked(order.status) : false;
            const canMarkArrived =
              order?.status === 'Trucks in Transit' ||
              order?.status === 'Out for Delivery';
            const isDelivered = order?.status === 'Delivered';
            const isPending = order?.status === 'Distributor Confirmations Pending';

            const eta = new Date(Number(delivery.estimatedDeliveryTime) / 1_000_000);

            return (
              <Card key={delivery.deliveryId} className={locked ? 'opacity-80' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-mono">{delivery.orderId}</CardTitle>
                      {store && (
                        <p className="text-sm text-muted-foreground mt-1">{store.storeName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isDelivered && (
                        <Badge className="bg-green-600 gap-1">
                          <Lock className="w-3 h-3" />
                          Delivered
                        </Badge>
                      )}
                      {isPending && (
                        <Badge variant="secondary" className="gap-1">
                          Confirmation Pending
                        </Badge>
                      )}
                      {!isDelivered && !isPending && order && (
                        <Badge variant="outline">{order.status}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Delivery details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{delivery.truckNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{delivery.driverContact}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>Driver: {delivery.driverName}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>
                        ETA:{' '}
                        {isNaN(eta.getTime())
                          ? 'Not set'
                          : eta.toLocaleDateString() + ' ' + eta.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {delivery.notes && (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded p-2">
                      {delivery.notes}
                    </p>
                  )}

                  {/* Actions */}
                  {isDelivered ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Delivery confirmed and locked
                    </div>
                  ) : canMarkArrived || isPending ? (
                    <Button
                      className="w-full"
                      onClick={() => handleMarkArrived(delivery.orderId, delivery.deliveryId)}
                    >
                      {isPending ? 'Complete Confirmation' : 'Mark Truck Arrived & Confirm'}
                    </Button>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Waiting for order to reach delivery stage...
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Distributor Workflow Dialog */}
      {workflowOrderId && (
        <DistributorWorkflowDialog
          orderId={workflowOrderId}
          open={!!workflowOrderId}
          onClose={() => {
            setWorkflowOrderId(null);
            setWorkflowDeliveryId(null);
          }}
          onSuccess={handleWorkflowSuccess}
        />
      )}
    </div>
  );
}
