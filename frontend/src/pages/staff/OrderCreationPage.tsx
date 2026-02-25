import React, { useState } from 'react';
import { useAllStores, useCreateOrder } from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShoppingCart, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

function generateOrderId(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${datePart}-${rand}`;
}

export default function OrderCreationPage() {
  const { user } = useAuth();
  const { data: stores = [], isLoading: storesLoading } = useAllStores();
  const createOrderMutation = useCreateOrder();

  const [storeId, setStoreId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!storeId) {
      setError('Please select a store.');
      return;
    }
    const qty = parseInt(quantity, 10);
    const rateVal = parseFloat(rate);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (!rateVal || rateVal <= 0) {
      setError('Please enter a valid rate.');
      return;
    }

    setSubmitting(true);
    try {
      const orderId = generateOrderId();
      await createOrderMutation.mutateAsync({
        orderId,
        storeId: BigInt(storeId),
        quantity: BigInt(qty),
        rate: rateVal,
        notes: notes.trim(),
        status: 'Pending Approval',
        timestamp: BigInt(Date.now()),
      });
      setSuccess(true);
      setStoreId('');
      setQuantity('');
      setRate('');
      setNotes('');
      toast.success(`Order ${orderId} created successfully!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('Permission') ? 'Permission denied. Please ensure you are logged in.' : msg);
      toast.error('Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Order</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Place a new order for a store — it will be sent for admin approval
        </p>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            New Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Order created successfully and sent for approval!
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="store">Store *</Label>
              {storesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading stores...
                </div>
              ) : (
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger id="store">
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)}>
                        {store.storeName} — {store.ownerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (units) *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate (₹ per unit) *</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 12.50"
                />
              </div>
            </div>

            {quantity && rate && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Total Value:{' '}
                  <span className="font-bold text-foreground text-base">
                    ₹{(parseFloat(quantity || '0') * parseFloat(rate || '0')).toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this order..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={submitting || storesLoading}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Create Order
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
