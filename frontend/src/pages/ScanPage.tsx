import React, { useState, useCallback } from 'react';
import { QrCode, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import QRScanModal from '../components/qr/QRScanModal';
import { useAllOrders, useUpdateOrderStatusUsingQR } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { decodeQRData } from '../utils/orderUtils';
import type { OrderRecord } from '../backend';

export default function ScanPage() {
  const { sessionEmail, user } = useAuth();

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [lastScannedOrder, setLastScannedOrder] = useState<OrderRecord | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: orders, refetch } = useAllOrders(sessionEmail);
  const updateStatusMutation = useUpdateOrderStatusUsingQR();

  const handleScanned = useCallback(async (scannedValue: string) => {
    setScanModalOpen(false);
    setScanError(null);
    setScanSuccess(null);
    setIsProcessing(true);

    try {
      const decodedOrderId = decodeQRData(scannedValue);

      if (!decodedOrderId) {
        setScanError('Invalid QR code. Could not decode order ID.');
        return;
      }

      const order = orders?.find((o) => o.orderId === decodedOrderId);

      if (!order) {
        setScanError(`Order "${decodedOrderId}" not found. Please refresh and try again.`);
        return;
      }

      if (!order.qrCode) {
        setScanError(`Order "${decodedOrderId}" does not have a QR code assigned yet.`);
        return;
      }

      const qrCodeValue = order.qrCode.value;

      await updateStatusMutation.mutateAsync({
        orderId: decodedOrderId,
        qrCodeValue,
        sessionEmail,
      });

      await refetch();
      setLastScannedOrder(order);
      setScanSuccess(`Order ${decodedOrderId} status updated successfully!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process QR scan';
      setScanError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [orders, sessionEmail, updateStatusMutation, refetch]);

  const userRole = user?.role ?? 'staff';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR Scanner</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Scan order QR codes to update workflow status
          </p>
        </div>
        <Badge variant="outline" className="capitalize">{userRole}</Badge>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Scan Order QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Point your camera at an order QR code to advance its workflow status.
          </p>
          <Button
            onClick={() => {
              setScanError(null);
              setScanSuccess(null);
              setScanModalOpen(true);
            }}
            disabled={isProcessing}
            className="gap-2"
          >
            <QrCode className="h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Open Scanner'}
          </Button>
        </CardContent>
      </Card>

      {lastScannedOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Last Scanned Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Order ID:</span>
                <p className="font-mono font-medium">{lastScannedOrder.orderId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium">{lastScannedOrder.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Quantity:</span>
                <p>{String(lastScannedOrder.quantity)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Rate:</span>
                <p>₹{lastScannedOrder.rate}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Orders
            </Button>
          </CardContent>
        </Card>
      )}

      <QRScanModal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        onScanned={handleScanned}
        title="Scan Order QR Code"
      />
    </div>
  );
}
