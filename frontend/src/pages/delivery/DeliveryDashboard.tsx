import React, { useState, useCallback } from 'react';
import { Package, Truck, CheckCircle, QrCode, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import QRScanModal from '../../components/qr/QRScanModal';
import EmptyTruckImageUpload from '../../components/delivery/EmptyTruckImageUpload';
import {
  useGetAssignedOrdersForDeliveryUser,
  useUpdateOrderStatusByDeliveryUser,
  useAddGpsLocation,
} from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { decodeQRData } from '../../utils/orderUtils';
import type { OrderRecord } from '../../backend';
import { Principal } from '@dfinity/principal';

export default function DeliveryDashboard() {
  const { sessionEmail } = useAuth();
  const { identity } = useInternetIdentity();

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanTargetOrder, setScanTargetOrder] = useState<OrderRecord | null>(null);
  const [scanAction, setScanAction] = useState<'dispatch' | 'deliver' | null>(null);
  const [emptyTruckUploadOpen, setEmptyTruckUploadOpen] = useState(false);
  const [deliveredOrderId, setDeliveredOrderId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  const deliveryPrincipal: Principal | null = React.useMemo(() => {
    if (!identity) return null;
    try {
      return identity.getPrincipal();
    } catch {
      return null;
    }
  }, [identity]);

  const {
    data: assignedOrders,
    isLoading,
    error,
    refetch,
  } = useGetAssignedOrdersForDeliveryUser(deliveryPrincipal, sessionEmail);

  const updateStatusMutation = useUpdateOrderStatusByDeliveryUser();
  const addGpsMutation = useAddGpsLocation();

  const activeOrders = React.useMemo(() => {
    if (!assignedOrders) return [];
    return assignedOrders.filter((o) =>
      ['Assigned to Delivery', 'Dispatched', 'Out for Delivery'].includes(o.status)
    );
  }, [assignedOrders]);

  const completedOrders = React.useMemo(() => {
    if (!assignedOrders) return [];
    return assignedOrders.filter((o) =>
      ['Delivered', 'Trucks in Transit', 'Distributor Confirmations Pending'].includes(o.status)
    );
  }, [assignedOrders]);

  const handleOpenScan = useCallback((order: OrderRecord, action: 'dispatch' | 'deliver') => {
    setScanTargetOrder(order);
    setScanAction(action);
    setScanError(null);
    setScanSuccess(null);
    setScanModalOpen(true);
  }, []);

  const handleScanned = useCallback(async (scannedValue: string) => {
    setScanModalOpen(false);
    setScanError(null);
    setScanSuccess(null);

    if (!scanTargetOrder || !scanAction) return;

    const decodedOrderId = decodeQRData(scannedValue);

    if (!decodedOrderId) {
      setScanError('Invalid QR code scanned. Please try again.');
      return;
    }

    if (decodedOrderId !== scanTargetOrder.orderId) {
      setScanError(
        `QR code does not match this order. Expected: ${scanTargetOrder.orderId}, Got: ${decodedOrderId}`
      );
      return;
    }

    try {
      if (scanAction === 'dispatch') {
        await updateStatusMutation.mutateAsync({
          orderId: scanTargetOrder.orderId,
          newStatus: 'Out for Delivery',
          sessionEmail,
        });

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await addGpsMutation.mutateAsync({
                  orderId: scanTargetOrder.orderId,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  sessionEmail,
                });
              } catch {
                // GPS update failure is non-critical
              }
            },
            () => {
              // GPS permission denied - non-critical
            }
          );
        }

        setScanSuccess(`Order ${scanTargetOrder.orderId} marked as Out for Delivery!`);
      } else if (scanAction === 'deliver') {
        await updateStatusMutation.mutateAsync({
          orderId: scanTargetOrder.orderId,
          newStatus: 'Trucks in Transit',
          sessionEmail,
        });

        setScanSuccess(`Order ${scanTargetOrder.orderId} marked as Trucks in Transit!`);
        setDeliveredOrderId(scanTargetOrder.orderId);
        setEmptyTruckUploadOpen(true);
      }

      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      setScanError(message);
    } finally {
      setScanTargetOrder(null);
      setScanAction(null);
    }
  }, [scanTargetOrder, scanAction, sessionEmail, updateStatusMutation, addGpsMutation, refetch]);

  if (!identity) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view your delivery assignments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delivery Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your assigned deliveries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {scanError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{scanError}</AlertDescription>
        </Alert>
      )}
      {scanSuccess && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{scanSuccess}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load assigned orders. Please refresh.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && activeOrders.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No active deliveries assigned</p>
            <p className="text-sm text-muted-foreground mt-1">
              Orders assigned to you will appear here.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for new assignments
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && activeOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Active Deliveries ({activeOrders.length})
          </h2>
          {activeOrders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onScan={handleOpenScan}
              isUpdating={updateStatusMutation.isPending}
            />
          ))}
        </div>
      )}

      {!isLoading && completedOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Completed ({completedOrders.length})
          </h2>
          {completedOrders.map((order) => (
            <Card key={order.orderId} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{order.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {String(order.quantity)} | Rate: ₹{order.rate}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    {order.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QRScanModal
        open={scanModalOpen}
        onClose={() => {
          setScanModalOpen(false);
          setScanTargetOrder(null);
          setScanAction(null);
        }}
        onScanned={handleScanned}
        title={scanAction === 'dispatch' ? 'Scan QR to Dispatch' : 'Scan QR to Mark Delivered'}
      />

      {deliveredOrderId && (
        <EmptyTruckImageUpload
          open={emptyTruckUploadOpen}
          orderId={deliveredOrderId}
          onClose={() => {
            setEmptyTruckUploadOpen(false);
            setDeliveredOrderId(null);
          }}
        />
      )}
    </div>
  );
}

interface OrderCardProps {
  order: OrderRecord;
  onScan: (order: OrderRecord, action: 'dispatch' | 'deliver') => void;
  isUpdating: boolean;
}

function OrderCard({ order, onScan, isUpdating }: OrderCardProps) {
  const canDispatch = order.status === 'Dispatched';
  const canDeliver = order.status === 'Out for Delivery';
  const isAssigned = order.status === 'Assigned to Delivery';

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{order.orderId}</CardTitle>
          <Badge
            variant={
              order.status === 'Out for Delivery'
                ? 'default'
                : order.status === 'Dispatched'
                ? 'secondary'
                : 'outline'
            }
          >
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Quantity:</span>{' '}
            <span className="font-medium">{String(order.quantity)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rate:</span>{' '}
            <span className="font-medium">₹{order.rate}</span>
          </div>
        </div>

        {order.notes && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{order.notes}</p>
        )}

        {order.gpsLocation && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>
              {order.gpsLocation.latitude.toFixed(4)}, {order.gpsLocation.longitude.toFixed(4)}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {isAssigned && (
            <p className="text-xs text-muted-foreground italic">
              Waiting for dispatch confirmation
            </p>
          )}
          {canDispatch && (
            <Button
              size="sm"
              onClick={() => onScan(order, 'dispatch')}
              disabled={isUpdating}
              className="gap-2"
            >
              <QrCode className="h-4 w-4" />
              Scan to Confirm Out for Delivery
            </Button>
          )}
          {canDeliver && (
            <Button
              size="sm"
              onClick={() => onScan(order, 'deliver')}
              disabled={isUpdating}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <QrCode className="h-4 w-4" />
              Scan to Mark Delivered
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
