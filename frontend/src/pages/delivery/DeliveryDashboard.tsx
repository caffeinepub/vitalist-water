import React, { useState, useEffect } from 'react';
import { useAllOrders, useAllStores, useUpdateOrder } from '../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import StatusBadge from '../../components/orders/StatusBadge';
import QRScanModal from '../../components/qr/QRScanModal';
import { Truck, MapPin, Navigation, ScanLine, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { parseOrderMeta, buildNotesWithMeta } from '../../utils/orderUtils';
import { getCurrentPosition } from '../../utils/geoUtils';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DeliveryDashboard() {
  const { data: orders = [], isLoading } = useAllOrders();
  const { data: stores = [] } = useAllStores();
  const updateOrder = useUpdateOrder();

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setUserLat(pos.latitude);
        setUserLng(pos.longitude);
      })
      .catch(() => {});
  }, []);

  const myOrders = orders.filter(
    (o) => o.status === 'Dispatched' || o.status === 'Out for Delivery'
  );

  const getStore = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx] || null;
  };

  const handleScanned = async (orderId: string) => {
    setProcessing(true);
    try {
      const order = orders.find((o) => o.orderId === orderId);
      if (!order) {
        toast.error(`Order ${orderId} not found`);
        return;
      }

      const { userNotes, meta } = parseOrderMeta(order.notes);
      let lat = 0, lng = 0;
      try {
        const pos = await getCurrentPosition();
        lat = pos.latitude;
        lng = pos.longitude;
      } catch {
        toast.warning('GPS unavailable, proceeding without location');
      }

      if (order.status === 'Dispatched') {
        const updatedMeta = { ...meta, stage3Timestamp: Date.now(), stage3Lat: lat, stage3Lng: lng };
        await updateOrder.mutateAsync({
          orderId,
          order: {
            ...order,
            status: 'Out for Delivery',
            notes: buildNotesWithMeta(userNotes, updatedMeta),
          },
        });
        toast.success(`Order ${orderId} → Out for Delivery`);
      } else if (order.status === 'Out for Delivery') {
        const updatedMeta = { ...meta, stage4Timestamp: Date.now(), stage4Lat: lat, stage4Lng: lng };
        await updateOrder.mutateAsync({
          orderId,
          order: {
            ...order,
            status: 'Delivered',
            notes: buildNotesWithMeta(userNotes, updatedMeta),
          },
        });
        toast.success(`Order ${orderId} → Delivered ✓`);
      } else {
        toast.error(`Order ${orderId} is in "${order.status}" status — not eligible for delivery scan`);
      }
    } catch (err: unknown) {
      toast.error('Scan failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Deliveries</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {myOrders.length} order{myOrders.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
        <Button
          onClick={() => setScanModalOpen(true)}
          className="gap-2"
          disabled={processing}
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanLine className="h-4 w-4" />
          )}
          Scan QR
        </Button>
      </div>

      {/* GPS status */}
      {userLat !== null && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <MapPin className="h-3.5 w-3.5 text-green-500" />
          <span>GPS active: {userLat.toFixed(4)}, {userLng?.toFixed(4)}</span>
        </div>
      )}

      {/* Orders list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : myOrders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-foreground">No active deliveries</p>
          <p className="text-sm text-muted-foreground mt-1">
            Orders dispatched to you will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.map((order) => {
            const store = getStore(order.storeId);
            const distance =
              userLat !== null && userLng !== null && store && store.latitude !== 0
                ? getDistanceKm(userLat, userLng, store.latitude, store.longitude)
                : null;

            return (
              <div
                key={order.orderId}
                className="rounded-xl border border-border bg-card card-shadow p-4 space-y-3"
              >
                {/* Order header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-foreground">{order.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(Number(order.timestamp) / 1_000_000).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Store info */}
                {store && (
                  <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                    <p className="font-semibold text-sm text-foreground">{store.storeName}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{store.address}</span>
                    </div>
                    {store.mobileNumber && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{store.mobileNumber}</span>
                      </div>
                    )}
                    {distance !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600">
                        <Navigation className="h-3 w-3" />
                        <span>{distance.toFixed(1)} km away</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Order details */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Qty: <span className="font-semibold text-foreground">{Number(order.quantity)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">
                      ₹{(Number(order.quantity) * order.rate).toFixed(2)}
                    </span>
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {store && store.latitude !== 0 && (
                    <a
                      href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <Navigation className="h-3.5 w-3.5" />
                        Navigate
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setScanModalOpen(true)}
                    disabled={processing}
                  >
                    <ScanLine className="h-3.5 w-3.5" />
                    Scan QR
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QRScanModal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        onScanned={handleScanned}
        title="Delivery Scan"
        description="Scan the order QR code to update delivery status"
      />
    </div>
  );
}
