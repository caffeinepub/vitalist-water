import React, { useState } from 'react';
import { useGetAllOrders, useUpdateOrder } from '../hooks/useQueries';
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
  const { data: orders = [] } = useGetAllOrders();
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
          // Stage 3: Dispatched → Out for Delivery
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
            updatedOrder: {
              ...order,
              status: 'Out for Delivery',
              notes: buildNotesWithMeta(userNotes, updatedMeta),
            },
          });
          setLastResult({ success: true, message: `Order ${orderId} is now Out for Delivery. GPS captured.`, orderId });
          toast.success(`Order ${orderId} → Out for Delivery`);
        } else if (order.status === 'Out for Delivery') {
          // Stage 4: Out for Delivery → Delivered
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
            updatedOrder: {
              ...order,
              status: 'Delivered',
              notes: buildNotesWithMeta(userNotes, updatedMeta),
            },
          });
          setLastResult({ success: true, message: `Order ${orderId} delivered successfully! Order is now locked.`, orderId });
          toast.success(`Order ${orderId} → Delivered ✓`);
        } else {
          setLastResult({
            success: false,
            message: `Order ${orderId} is in "${order.status}" status. Expected "Dispatched" or "Out for Delivery".`,
          });
        }
        return;
      }

      // Admin stage 1
      if (role === 'admin') {
        if (order.status !== 'Approved') {
          setLastResult({
            success: false,
            message: `Order ${orderId} is in "${order.status}" status. Expected "Approved" for Stage 1 scan.`,
          });
          return;
        }
        if (meta.stage1Timestamp) {
          setLastResult({ success: false, message: `Order ${orderId} has already been scanned at Stage 1.` });
          return;
        }
        const updatedMeta = { ...meta, stage1Timestamp: Date.now() };
        await updateOrder.mutateAsync({
          orderId,
          updatedOrder: {
            ...order,
            status: 'Ready',
            notes: buildNotesWithMeta(userNotes, updatedMeta),
          },
        });
        setLastResult({ success: true, message: `Order ${orderId} packed and marked as Ready.`, orderId });
        toast.success(`Order ${orderId} → Ready`);
        return;
      }

      // Staff stage 2
      if (role === 'staff') {
        if (order.status !== 'Ready') {
          setLastResult({
            success: false,
            message: `Order ${orderId} is in "${order.status}" status. Expected "Ready" for Stage 2 scan.`,
          });
          return;
        }
        if (meta.stage2Timestamp) {
          setLastResult({ success: false, message: `Order ${orderId} has already been scanned at Stage 2.` });
          return;
        }
        const updatedMeta = { ...meta, stage2Timestamp: Date.now() };
        await updateOrder.mutateAsync({
          orderId,
          updatedOrder: {
            ...order,
            status: 'Dispatched',
            notes: buildNotesWithMeta(userNotes, updatedMeta),
          },
        });
        setLastResult({ success: true, message: `Order ${orderId} handed over and marked as Dispatched.`, orderId });
        toast.success(`Order ${orderId} → Dispatched`);
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLastResult({ success: false, message: `Failed to update order: ${msg}` });
      toast.error('Scan failed: ' + msg);
    } finally {
      setProcessing(false);
    }
  };

  // Orders eligible for this scan stage
  const eligibleOrders = orders.filter((o) => {
    if (role === 'admin') return o.status === 'Approved';
    if (role === 'staff') return o.status === 'Ready';
    if (role === 'delivery') return o.status === 'Dispatched' || o.status === 'Out for Delivery';
    return false;
  });

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{config.subtitle}</p>
      </div>

      {/* Scan button */}
      <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-8 flex flex-col items-center gap-4`}>
        <div className={`w-20 h-20 rounded-2xl bg-white shadow-card flex items-center justify-center`}>
          <ScanLine className={`h-10 w-10 ${config.color}`} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Ready to Scan</p>
          <p className="text-sm text-muted-foreground mt-1">
            {eligibleOrders.length} order{eligibleOrders.length !== 1 ? 's' : ''} waiting for this stage
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 px-8"
          onClick={() => setScanModalOpen(true)}
          disabled={processing}
        >
          {processing ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
          ) : (
            <><ScanLine className="h-5 w-5" /> Scan QR Code</>
          )}
        </Button>
        {config.requiresGPS && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            GPS location will be captured automatically
          </p>
        )}
      </div>

      {/* Last scan result */}
      {lastResult && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          lastResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {lastResult.success ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-semibold text-sm ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {lastResult.success ? 'Scan Successful' : 'Scan Failed'}
            </p>
            <p className={`text-sm mt-0.5 ${lastResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {lastResult.message}
            </p>
          </div>
          <button
            onClick={() => setLastResult(null)}
            className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Eligible orders list */}
      {eligibleOrders.length > 0 && (
        <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Orders Awaiting This Stage ({eligibleOrders.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {eligibleOrders.slice(0, 10).map((order) => (
              <div key={order.orderId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-mono font-semibold text-sm text-foreground">{order.orderId}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(Number(order.timestamp) / 1_000_000).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {eligibleOrders.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">No orders are currently waiting for this scan stage.</p>
        </div>
      )}

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
