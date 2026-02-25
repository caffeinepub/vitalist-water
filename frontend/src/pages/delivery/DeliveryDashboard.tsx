import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useActor } from '../../hooks/useActor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderRecord, Store, ExternalBlob } from '../../backend';
import {
  Truck, QrCode, MapPin, Package, CheckCircle, Loader2, Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import QRScanModal from '../../components/qr/QRScanModal';
import EmptyTruckImageUpload from '../../components/delivery/EmptyTruckImageUpload';

const DELIVERY_STATUSES = ['Dispatched', 'Out for Delivery'];

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
  });
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  // scanningOrder holds the order we want to scan for; null means modal is closed
  const [scanningOrder, setScanningOrder] = useState<OrderRecord | null>(null);
  const [showEmptyTruckUpload, setShowEmptyTruckUpload] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const sessionEmail = user?.email || '';

  const { data: allOrders, isLoading } = useQuery<OrderRecord[]>({
    queryKey: ['allOrders', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });

  const { data: stores } = useQuery<Store[]>({
    queryKey: ['stores', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStores(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });

  const deliveryOrders = (allOrders || []).filter((o) =>
    DELIVERY_STATUSES.includes(o.status)
  );

  const scanQRMutation = useMutation({
    mutationFn: async ({
      orderId,
      qrValue,
      currentStatus,
    }: {
      orderId: string;
      qrValue: string;
      currentStatus: string;
    }) => {
      if (!actor) throw new Error('Actor not available');

      // Update status via QR
      await actor.updateOrderStatusUsingQR(orderId, qrValue, sessionEmail);

      // If transitioning from Dispatched → Out for Delivery, also record GPS
      if (currentStatus === 'Dispatched') {
        try {
          const pos = await getCurrentPosition();
          await actor.addGpsLocation(
            orderId,
            pos.coords.latitude,
            pos.coords.longitude,
            sessionEmail
          );
        } catch {
          // GPS is best-effort; don't fail the whole operation
        }
      }

      return { orderId, currentStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      setScanningOrder(null);
      setProcessingOrderId(null);

      if (result.currentStatus === 'Out for Delivery') {
        // After marking as delivered, prompt for empty truck image
        setShowEmptyTruckUpload(result.orderId);
        setScanSuccess(`Order ${result.orderId} marked as delivered!`);
      } else {
        setScanSuccess(`Order ${result.orderId} status updated successfully!`);
      }
      setTimeout(() => setScanSuccess(null), 4000);
    },
    onError: (err: any) => {
      setScanError(err?.message || 'QR scan failed. Please try again.');
      setProcessingOrderId(null);
    },
  });

  const addEmptyTruckImageMutation = useMutation({
    mutationFn: async ({ orderId, blob }: { orderId: string; blob: ExternalBlob }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addEmptyTruckImage(orderId, blob, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
    },
  });

  // This is called by QRScanModal via onScanned(orderId) — orderId here is the decoded QR value
  const handleScanned = (scannedValue: string) => {
    if (!scanningOrder) return;
    setScanError(null);
    setProcessingOrderId(scanningOrder.orderId);
    scanQRMutation.mutate({
      orderId: scanningOrder.orderId,
      qrValue: scannedValue,
      currentStatus: scanningOrder.status,
    });
  };

  const handleEmptyTruckUpload = async (orderId: string, blob: ExternalBlob) => {
    await addEmptyTruckImageMutation.mutateAsync({ orderId, blob });
  };

  const getStoreName = (storeId: bigint): string => {
    const store = (stores || []).find((_, idx) => BigInt(idx + 1) === storeId);
    return store?.storeName || `Store #${storeId.toString()}`;
  };

  const getStoreAddress = (storeId: bigint): string => {
    const store = (stores || []).find((_, idx) => BigInt(idx + 1) === storeId);
    return store?.address || '';
  };

  const handleNavigate = (storeId: bigint) => {
    const store = (stores || []).find((_, idx) => BigInt(idx + 1) === storeId);
    if (store) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
      window.open(url, '_blank');
    }
  };

  const getScanButtonLabel = (status: string) => {
    switch (status) {
      case 'Dispatched': return 'Scan QR — Start Delivery';
      case 'Out for Delivery': return 'Scan QR — Mark Delivered';
      default: return 'Scan QR';
    }
  };

  const stats = {
    dispatched: deliveryOrders.filter((o) => o.status === 'Dispatched').length,
    outForDelivery: deliveryOrders.filter((o) => o.status === 'Out for Delivery').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          Delivery Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your active deliveries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.dispatched}</p>
                <p className="text-xs text-muted-foreground">Dispatched</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.outForDelivery}</p>
                <p className="text-xs text-muted-foreground">Out for Delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {scanSuccess && (
        <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{scanSuccess}</span>
        </div>
      )}

      {scanError && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm flex items-center justify-between">
          <span>{scanError}</span>
          <button onClick={() => setScanError(null)} className="underline ml-3">Dismiss</button>
        </div>
      )}

      {/* Delivery Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Active Deliveries ({deliveryOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading deliveries...</div>
          ) : deliveryOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No active deliveries assigned to you.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryOrders.map((order) => {
                    const isProcessing = processingOrderId === order.orderId;
                    return (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-xs font-medium">{order.orderId}</TableCell>
                        <TableCell className="text-sm">{getStoreName(order.storeId)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {getStoreAddress(order.storeId)}
                        </TableCell>
                        <TableCell>{order.quantity.toString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={order.status === 'Out for Delivery' ? 'default' : 'secondary'}
                            className="text-xs whitespace-nowrap"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {order.qrCode && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                disabled={isProcessing}
                                onClick={() => {
                                  setScanError(null);
                                  setScanningOrder(order);
                                }}
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <QrCode className="w-3 h-3 mr-1" />
                                    {getScanButtonLabel(order.status)}
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => handleNavigate(order.storeId)}
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Navigate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Scan Modal — uses existing onScanned interface */}
      <QRScanModal
        open={!!scanningOrder}
        onClose={() => {
          setScanningOrder(null);
          setScanError(null);
        }}
        onScanned={handleScanned}
        title="Delivery QR Scan"
        description={
          scanningOrder
            ? `Scanning for order ${scanningOrder.orderId} — ${scanningOrder.status}`
            : 'Scan the order QR code'
        }
      />

      {/* Empty Truck Image Upload */}
      {showEmptyTruckUpload && (
        <EmptyTruckImageUpload
          orderId={showEmptyTruckUpload}
          open={!!showEmptyTruckUpload}
          onClose={() => setShowEmptyTruckUpload(null)}
          onUpload={handleEmptyTruckUpload}
        />
      )}
    </div>
  );
}
