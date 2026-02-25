import React, { useState, useEffect } from 'react';
import { useGetAllOrders, useGetAllStores } from '../../hooks/useQueries';
import { OrderRecord } from '../../backend';
import { Button } from '@/components/ui/button';
import StatusBadge from '../../components/orders/StatusBadge';
import QRScanModal from '../../components/qr/QRScanModal';
import { MapPin, Phone, Navigation, ScanLine, Truck, Package, Loader2, RefreshCw } from 'lucide-react';
import { calculateDistance, formatDistance, getCurrentPosition, getGoogleMapsUrl, GeoPosition } from '../../utils/geoUtils';
import { parseOrderMeta, buildNotesWithMeta } from '../../utils/orderUtils';
import { useUpdateOrder } from '../../hooks/useQueries';
import { toast } from 'sonner';

export default function DeliveryDashboard() {
  const { data: orders = [], isLoading, refetch } = useGetAllOrders();
  const { data: stores = [] } = useGetAllStores();
  const updateOrder = useUpdateOrder();

  const [currentPos, setCurrentPos] = useState<GeoPosition | null>(null);
  const [posLoading, setPosLoading] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const deliveryOrders = orders.filter(
    (o) => o.status === 'Dispatched' || o.status === 'Out for Delivery'
  );

  const getStore = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx] ?? null;
  };

  const fetchLocation = async () => {
    setPosLoading(true);
    try {
      const pos = await getCurrentPosition();
      setCurrentPos(pos);
    } catch {
      toast.error('Could not get your location. Please enable GPS.');
    } finally {
      setPosLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleScanned = async (orderId: string) => {
    setProcessing(true);
    try {
      const order = orders.find((o) => o.orderId === orderId);
      if (!order) {
        toast.error(`Order ${orderId} not found`);
        return;
      }

      const { userNotes, meta } = parseOrderMeta(order.notes);
      let lat = currentPos?.latitude ?? 0;
      let lng = currentPos?.longitude ?? 0;

      try {
        const pos = await getCurrentPosition();
        lat = pos.latitude;
        lng = pos.longitude;
      } catch {
        // use cached position
      }

      if (order.status === 'Dispatched') {
        const updatedMeta = { ...meta, stage3Timestamp: Date.now(), stage3Lat: lat, stage3Lng: lng };
        await updateOrder.mutateAsync({
          orderId,
          updatedOrder: {
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
          updatedOrder: {
            ...order,
            status: 'Delivered',
            notes: buildNotesWithMeta(userNotes, updatedMeta),
          },
        });
        toast.success(`Order ${orderId} → Delivered ✓`);
      } else {
        toast.error(`Order ${orderId} is in "${order.status}" status — cannot scan at this stage.`);
      }
    } catch (err: unknown) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Deliveries</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {deliveryOrders.length} active order{deliveryOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setScanModalOpen(true)}
            disabled={processing}
            className="gap-1.5"
          >
            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
            Scan QR
          </Button>
        </div>
      </div>

      {/* GPS status */}
      <div className={`rounded-lg border px-4 py-2.5 flex items-center justify-between text-sm ${
        currentPos ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 ${currentPos ? 'text-green-600' : 'text-amber-600'}`} />
          <span className={currentPos ? 'text-green-700' : 'text-amber-700'}>
            {currentPos
              ? `GPS: ${currentPos.latitude.toFixed(4)}, ${currentPos.longitude.toFixed(4)}`
              : 'GPS location not available'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLocation}
          disabled={posLoading}
          className="h-7 text-xs gap-1"
        >
          {posLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
          Update
        </Button>
      </div>

      {/* Orders */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-5 bg-muted rounded w-32 mb-3" />
              <div className="h-4 bg-muted rounded w-48 mb-2" />
              <div className="h-4 bg-muted rounded w-40" />
            </div>
          ))}
        </div>
      ) : deliveryOrders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-foreground">No Active Deliveries</p>
          <p className="text-sm text-muted-foreground mt-1">
            Orders assigned to you will appear here when dispatched.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveryOrders.map((order) => {
            const store = getStore(order.storeId);
            const distance =
              currentPos && store && store.latitude !== 0
                ? calculateDistance(currentPos.latitude, currentPos.longitude, store.latitude, store.longitude)
                : null;

            return (
              <DeliveryOrderCard
                key={order.orderId}
                order={order}
                store={store}
                distance={distance}
                onScan={() => setScanModalOpen(true)}
                processing={processing}
              />
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

interface DeliveryOrderCardProps {
  order: OrderRecord;
  store: { storeName: string; ownerName: string; mobileNumber: string; address: string; latitude: number; longitude: number } | null;
  distance: number | null;
  onScan: () => void;
  processing: boolean;
}

function DeliveryOrderCard({ order, store, distance, onScan, processing }: DeliveryOrderCardProps) {
  const isOutForDelivery = order.status === 'Out for Delivery';

  return (
    <div className={`rounded-xl border bg-card card-shadow overflow-hidden ${
      isOutForDelivery ? 'border-orange-200' : 'border-border'
    }`}>
      {/* Status bar */}
      <div className={`px-4 py-2 flex items-center justify-between ${
        isOutForDelivery ? 'bg-orange-50' : 'bg-blue-50'
      }`}>
        <span className="font-mono font-bold text-sm text-foreground">{order.orderId}</span>
        <StatusBadge status={order.status} size="sm" />
      </div>

      <div className="p-4 space-y-3">
        {/* Store info */}
        {store ? (
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground text-base">{store.storeName}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <a href={`tel:${store.mobileNumber}`} className="hover:text-primary transition-colors">
                {store.mobileNumber}
              </a>
            </div>
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{store.address}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Store details unavailable</p>
        )}

        {/* Distance & order info */}
        <div className="flex items-center gap-4 text-sm">
          {distance !== null && (
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Navigation className="h-3.5 w-3.5" />
              {formatDistance(distance)} away
            </div>
          )}
          <div className="text-muted-foreground">
            Qty: <span className="font-semibold text-foreground">{order.quantity.toString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {store && store.latitude !== 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => window.open(getGoogleMapsUrl(store.latitude, store.longitude), '_blank')}
            >
              <Navigation className="h-3.5 w-3.5" />
              Open in Maps
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onScan}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanLine className="h-3.5 w-3.5" />
            )}
            {isOutForDelivery ? 'Complete Delivery' : 'Start Delivery'}
          </Button>
        </div>
      </div>
    </div>
  );
}
