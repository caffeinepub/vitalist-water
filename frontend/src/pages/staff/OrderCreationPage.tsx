import React, { useState, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  useAllOrders,
  useAllStores,
  useCreateOrder,
  useUpdateOrderStatusUsingQR,
} from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Loader2, Plus, QrCode } from 'lucide-react';
import type { OrderRecord } from '../../backend';

const QRScanModal = React.lazy(() => import('../../components/qr/QRScanModal'));

interface OrderForm {
  storeId: string;
  quantity: string;
  rate: string;
  notes: string;
}

const emptyForm: OrderForm = { storeId: '', quantity: '', rate: '', notes: '' };

export default function OrderCreationPage() {
  const { user } = useAuth();
  const email = user?.email ?? '';

  const { data: orders = [], isLoading: ordersLoading } = useAllOrders(email);
  const { data: stores = [], isLoading: storesLoading } = useAllStores(email);
  const createOrderMutation = useCreateOrder();
  const updateQRMutation = useUpdateOrderStatusUsingQR();

  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [scanTarget, setScanTarget] = useState<OrderRecord | null>(null);

  const approvedOrders = React.useMemo(
    () => (orders ?? []).filter((o) => o.status === 'Approved' || o.status === 'Ready'),
    [orders],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) {
      setFormError('Please select a store.');
      return;
    }
    const qty = parseInt(form.quantity);
    const rate = parseFloat(form.rate);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Please enter a valid quantity.');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      setFormError('Please enter a valid rate.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');
    try {
      const orderId = `ORD-${Date.now()}`;
      const order: OrderRecord = {
        orderId,
        storeId: BigInt(form.storeId),
        quantity: BigInt(qty),
        rate,
        notes: form.notes.trim(),
        status: 'Pending Approval',
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      };
      await createOrderMutation.mutateAsync({ order, sessionEmail: email });
      setForm(emptyForm);
      setFormSuccess(`Order ${orderId} created successfully!`);
      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanned = async (qrValue: string) => {
    if (!scanTarget) return;
    try {
      await updateQRMutation.mutateAsync({
        orderId: scanTarget.orderId,
        qrCodeValue: qrValue,
        sessionEmail: email,
      });
    } catch (err) {
      console.error('QR scan update error:', err);
    } finally {
      setScanTarget(null);
    }
  };

  const getStoreName = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx]?.storeName ?? `Store #${storeId}`;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Create Order</h1>

      {/* New Order Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Order</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Store *</Label>
                {storesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={form.storeId}
                    onValueChange={(v) => setForm((f) => ({ ...f, storeId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>
                          {store.storeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="space-y-1">
                <Label>Rate (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="e.g. 15.50"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes…"
                rows={2}
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-md p-2">
                <p className="text-sm text-green-700">{formSuccess}</p>
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Approved Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Approved Orders{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({approvedOrders.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : approvedOrders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">No approved orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>QR Scan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedOrders.map((order) => (
                    <TableRow key={order.orderId}>
                      <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                      <TableCell className="text-sm">{getStoreName(order.storeId)}</TableCell>
                      <TableCell>{Number(order.quantity)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {order.qrCode ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setScanTarget(order)}
                          >
                            <QrCode className="h-3 w-3 mr-1" />
                            Scan
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No QR</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Scan Modal */}
      <Suspense fallback={null}>
        <QRScanModal
          open={!!scanTarget}
          onClose={() => setScanTarget(null)}
          onScanned={handleScanned}
          title="Scan Order QR"
          description="Scan the QR code on the order to advance its status."
        />
      </Suspense>
    </div>
  );
}
