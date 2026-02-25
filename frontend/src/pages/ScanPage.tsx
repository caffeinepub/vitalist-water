import React, { useState } from 'react';
import { useAllOrders, useUpdateOrder } from '../hooks/useQueries';
import { OrderRecord } from '../backend';
import { Button } from '@/components/ui/button';
import StatusBadge from '../components/orders/StatusBadge';
import QRScanModal from '../components/qr/QRScanModal';
import { ScanLine, CheckCircle, AlertCircle, Package, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { parseOrderMeta, buildNotesWithMeta } from '../utils/orderUtils';
import { getCurrentPosition } from '../utils/geoUtils';

interface ScanPageProps {
  role: 'admin' | 'staff' | 'delivery';
}

const STAGE_CONFIG = {
  admin: {
    title: 'Stage 1 — Admin Scan',
    subtitle: 'Scan QR to confirm packing and mark order as Ready',
    fromStatus: 'Approved',
    toStatus: 'Ready',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    requiresGPS: false,
    metaKey: 'stage1Timestamp' as const,
  },
  staff: {
    title: 'Stage 2 — Staff Scan',
    subtitle: 'Scan QR to confirm handover and mark order as Dispatched',
    fromStatus: 'Ready',
    toStatus: 'Dispatched',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    requiresGPS: false,
    metaKey: 'stage2Timestamp' as const,
  },
  delivery: {
    title: 'Stage 3/4 — Delivery Scan',
    subtitle: 'Scan QR to update delivery status with GPS location',
    fromStatus: 'Dispatched',
    toStatus: 'Out for Delivery',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    requiresGPS: true,
    metaKey: 'stage3Timestamp' as const,
  },
};

export default function ScanPage({ role }: ScanPageProps) {
  const config = STAGE_CONFIG[role];
  const { data: orders = [] } = useAllOrders();
  const updateOrder = useUpdateOrder();

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);

  const handleScanned = async (orderId: string) => {
    setProcessing(true);
    setLastResult(null);

    try {
      const order = orders.find((o) => o.orderId === orderId);
      if (!order) {
        setLastResult({ success: false, message: `Order ${orderId} not found in the system.` });
        return;
      }

      const { userNotes, meta } = parseOrderMeta(order.notes);

      // Delivery role handles both stage 3 and stage 4
      if (role === 'delivery') {
        if (order.status === 'Dispatched') {
          let lat = 0, lng = 0;
          try {
            const pos = await getCurrentPosition();
            lat = pos.latitude;
            lng = pos.longitude;
          } catch {
            toast.warning('Could not get GPS location, proceeding without it');
          }
          const updatedMeta = {
            ...meta,
            stage3Timestamp: Date.now(),
            stage3Lat: lat,
            stage3Lng: lng,
          };
          await updateOrder.mutateAsync({
            orderId,
            order: {
              ...order,
              status: 'Out for Delivery',
              notes: buildNotesWithMeta(userNotes, updatedMeta),
            },
          });
          setLastResult({ success: true, message: `Order ${orderId} → Out for Delivery`, orderId });
          toast.success(`Order ${orderId} marked as Out for Delivery`);
        } else if (order.status === 'Out for Delivery') {
          let lat = 0, lng = 0;
          try {
            const pos = await getCurrentPosition();
            lat = pos.latitude;
            lng = pos.longitude;
          } catch {
            toast.warning('Could not get GPS location, proceeding without it');
          }
          const updatedMeta = {
            ...meta,
            stage4Timestamp: Date.now(),
            stage4Lat: lat,
            stage4Lng: lng,
          };
          await updateOrder.mutateAsync({
            orderId,
            order: {
              ...order,
              status: 'Delivered',
              notes: buildNotesWithMeta(userNotes, updatedMeta),
            },
          });
          setLastResult({ success: true, message: `Order ${orderId} → Delivered ✓`, orderId });
          toast.success(`Order ${orderId} marked as Delivered`);
        } else {
          setLastResult({
            success: false,
            message: `Order ${orderId} is in "${order.status}" status — not eligible for delivery scan`,
          });
        }
        return;
      }

      // Admin / Staff roles
      if (order.status !== config.fromStatus) {
        setLastResult({
          success: false,
          message: `Order ${orderId} is in "${order.status}" status. Expected "${config.fromStatus}".`,
        });
        return;
      }

      let lat = 0, lng = 0;
      if (config.requiresGPS) {
        try {
          const pos = await getCurrentPosition();
          lat = pos.latitude;
          lng = pos.longitude;
        } catch {
          toast.warning('Could not get GPS location, proceeding without it');
        }
      }

      const updatedMeta = {
        ...meta,
        [config.metaKey]: Date.now(),
        ...(config.requiresGPS ? { [`${config.metaKey.replace('Timestamp', 'Lat')}`]: lat, [`${config.metaKey.replace('Timestamp', 'Lng')}`]: lng } : {}),
      };

      await updateOrder.mutateAsync({
        orderId,
        order: {
          ...order,
          status: config.toStatus,
          notes: buildNotesWithMeta(userNotes, updatedMeta),
        },
      });

      setLastResult({ success: true, message: `Order ${orderId} → ${config.toStatus}`, orderId });
      toast.success(`Order ${orderId} updated to ${config.toStatus}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLastResult({ success: false, message: `Failed: ${msg}` });
      toast.error(`Scan failed: ${msg}`);
    } finally {
      setProcessing(false);
    }
  };

  const eligibleOrders = orders.filter((o) => {
    if (role === 'delivery') return o.status === 'Dispatched' || o.status === 'Out for Delivery';
    return o.status === config.fromStatus;
  });

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      {/* Header */}
      <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5`}>
        <h1 className={`text-xl font-bold ${config.color}`}>{config.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>
      </div>

      {/* Scan button */}
      <div className="flex flex-col items-center gap-4 py-6">
        <div className={`w-24 h-24 rounded-2xl ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center`}>
          <ScanLine className={`h-12 w-12 ${config.color}`} />
        </div>
        <Button
          size="lg"
          onClick={() => setScanModalOpen(true)}
          disabled={processing}
          className="gap-2 px-8"
        >
          {processing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ScanLine className="h-5 w-5" />
          )}
          {processing ? 'Processing…' : 'Scan QR Code'}
        </Button>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          lastResult.success
            ? 'border-green-200 bg-green-50'
            : 'border-red-200 bg-red-50'
        }`}>
          {lastResult.success ? (
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-semibold text-sm ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {lastResult.success ? 'Success' : 'Error'}
            </p>
            <p className={`text-sm mt-0.5 ${lastResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {lastResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Eligible orders */}
      <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">
            Eligible Orders ({eligibleOrders.length})
          </h3>
        </div>
        {eligibleOrders.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            No orders eligible for scanning at this stage
          </div>
        ) : (
          <div className="divide-y divide-border">
            {eligibleOrders.slice(0, 10).map((order) => (
              <div key={order.orderId} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-foreground">{order.orderId}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {Number(order.quantity)} · ₹{order.rate.toFixed(2)}
                  </p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      <QRScanModal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        onScanned={handleScanned}
        title={config.title}
        description={config.subtitle}
      />
    </div>
  );
}
