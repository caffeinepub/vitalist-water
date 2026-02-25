import React, { useState, useMemo } from 'react';
import { Plus, QrCode, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import QRScanModal from '../../components/qr/QRScanModal';
import {
  useAllStores,
  useCreateOrder,
  useAllOrders,
  useUpdateOrderStatusUsingQR,
} from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import { decodeQRData, getStatusColor } from '../../utils/orderUtils';
import type { OrderRecord } from '../../backend';

function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD-${timestamp}-${random}`;
}

export default function OrderCreationPage() {
  const { sessionEmail } = useAuth();
  const email = sessionEmail;

  const { data: stores } = useAllStores(email);
  const { data: orders, refetch: refetchOrders } = useAllOrders(email);
  const createOrderMutation = useCreateOrder();
  const updateStatusMutation = useUpdateOrderStatusUsingQR();

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR scan state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanTargetOrder, setScanTargetOrder] = useState<OrderRecord | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  // Order detail dialog
  const [detailOrder, setDetailOrder] = useState<OrderRecord | null>(null);

  const approvedOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => o.status === 'Approved');
  }, [orders]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedStoreId) {
      setFormError('Please select a store.');
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setFormError('Please enter a valid quantity.');
      return;
    }
    if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) {
      setFormError('Please enter a valid rate.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderId = generateOrderId();
      await createOrderMutation.mutateAsync({
        input: {
          orderId,
          storeId: BigInt(selectedStoreId),
          quantity: BigInt(Math.floor(Number(quantity))),
          rate: Number(rate),
          notes,
          timestamp: BigInt(Date.now() * 1_000_000),
        },
        sessionEmail: email,
      });

      setFormSuccess(`Order ${orderId} created successfully!`);
      setSelectedStoreId('');
      setQuantity('');
      setRate('');
      setNotes('');
      refetchOrders();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenScan = (order: OrderRecord) => {
    setScanTargetOrder(order);
    setScanError(null);
    setScanSuccess(null);
    setScanModalOpen(true);
  };

  const handleScanned = async (scannedValue: string) => {
    setScanModalOpen(false);
    setScanError(null);
    setScanSuccess(null);

    if (!scanTargetOrder) return;

    const decodedOrderId = decodeQRData(scannedValue);

    if (!decodedOrderId) {
      setScanError('Invalid QR code scanned.');
      return;
    }

    if (decodedOrderId !== scanTargetOrder.orderId) {
      setScanError(
        `QR code does not match. Expected: ${scanTargetOrder.orderId}, Got: ${decodedOrderId}`
      );
      return;
    }

    if (!scanTargetOrder.qrCode) {
      setScanError('This order does not have a QR code assigned yet.');
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        orderId: scanTargetOrder.orderId,
        qrCodeValue: scanTargetOrder.qrCode.value,
        sessionEmail: email,
      });

      setScanSuccess(`Order ${scanTargetOrder.orderId} status updated!`);
      refetchOrders();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setScanError(message);
    } finally {
      setScanTargetOrder(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Order</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create new orders and manage approved orders
        </p>
      </div>

      {/* Create Order Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            {formSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{formSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="store">Store *</Label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger id="store">
                    <SelectValue placeholder="Select a store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores?.map((store, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {store.storeName} — {store.ownerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate">Rate (₹) *</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Enter rate"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Scan Feedback */}
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

      {/* Approved Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Approved Orders ({approvedOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No approved orders at this time.
            </p>
          ) : (
            <div className="space-y-3">
              {approvedOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-mono text-sm font-medium">{order.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {String(order.quantity)} | Rate: ₹{order.rate}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailOrder(order)}
                    >
                      View
                    </Button>
                    {order.qrCode && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenScan(order)}
                        className="gap-1"
                      >
                        <QrCode className="h-3 w-3" />
                        Scan
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => { if (!open) setDetailOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Order ID:</span>
                  <p className="font-mono font-medium">{detailOrder.orderId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium">{detailOrder.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <p>{String(detailOrder.quantity)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rate:</span>
                  <p>₹{detailOrder.rate}</p>
                </div>
              </div>
              {detailOrder.notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1 bg-muted/50 rounded p-2">{detailOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Scan Modal */}
      <QRScanModal
        open={scanModalOpen}
        onClose={() => {
          setScanModalOpen(false);
          setScanTargetOrder(null);
        }}
        onScanned={handleScanned}
        title="Scan Order QR Code"
      />
    </div>
  );
}
