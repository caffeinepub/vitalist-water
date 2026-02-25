import React, { useState } from 'react';
import { useGetAllStores, useGetAllOrders, useCreateOrder } from '../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2, ShoppingCart, Package } from 'lucide-react';
import { toast } from 'sonner';
import { generateOrderId, generateInvoiceNumber, buildNotesWithMeta } from '../../utils/orderUtils';
import { useAuth } from '../../contexts/AuthContext';

export default function OrderCreationPage() {
  const { data: stores = [] } = useGetAllStores();
  const { data: orders = [] } = useGetAllOrders();
  const createOrder = useCreateOrder();
  const { currentUser } = useAuth();

  const [storeIndex, setStoreIndex] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const total = quantity && rate ? (parseFloat(quantity) * parseFloat(rate)).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeIndex) {
      toast.error('Please select a store');
      return;
    }

    const orderId = generateOrderId(orders);
    const invoiceNumber = generateInvoiceNumber(orderId);
    const notesWithMeta = buildNotesWithMeta(notes, { invoiceNumber });

    try {
      await createOrder.mutateAsync({
        orderId,
        storeId: BigInt(parseInt(storeIndex) + 1),
        quantity: BigInt(parseInt(quantity)),
        rate: parseFloat(rate),
        notes: notesWithMeta,
        status: 'Pending Approval',
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      });
      setSuccessOrderId(orderId);
      setStoreIndex('');
      setQuantity('');
      setRate('');
      setNotes('');
      toast.success(`Order ${orderId} created successfully!`);
    } catch (err: unknown) {
      toast.error('Failed to create order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create New Order</h1>
        <p className="text-muted-foreground text-sm mt-1">Fill in the details to create a new water delivery order</p>
      </div>

      {/* Success banner */}
      {successOrderId && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Order Created Successfully!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Order ID: <span className="font-mono font-bold">{successOrderId}</span>
            </p>
            <p className="text-xs text-green-600 mt-1">Status: Pending Admin Approval</p>
          </div>
          <button
            onClick={() => setSuccessOrderId(null)}
            className="ml-auto text-green-500 hover:text-green-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card card-shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Store selection */}
          <div className="space-y-1.5">
            <Label className="font-medium">Select Store *</Label>
            <Select value={storeIndex} onValueChange={setStoreIndex}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose a delivery store..." />
              </SelectTrigger>
              <SelectContent>
                {stores.length === 0 ? (
                  <SelectItem value="none" disabled>No stores available</SelectItem>
                ) : (
                  stores.map((store, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{store.storeName}</span>
                        <span className="text-xs text-muted-foreground">{store.address}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Store info preview */}
          {storeIndex !== '' && stores[parseInt(storeIndex)] && (
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm">
              <div className="font-medium text-foreground">{stores[parseInt(storeIndex)].storeName}</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                Owner: {stores[parseInt(storeIndex)].ownerName} · {stores[parseInt(storeIndex)].mobileNumber}
              </div>
              <div className="text-muted-foreground text-xs">{stores[parseInt(storeIndex)].address}</div>
            </div>
          )}

          {/* Quantity & Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-medium">Quantity (units) *</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium">Rate (₹ per unit) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 20.00"
                required
                className="h-11"
              />
            </div>
          </div>

          {/* Total preview */}
          {quantity && rate && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total Amount</span>
              <span className="text-lg font-bold text-primary">₹{total}</span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes for this order..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Order ID preview */}
          <div className="rounded-lg bg-muted/40 border border-border p-3 flex items-center gap-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Auto-generated Order ID</p>
              <p className="text-sm font-mono font-semibold text-foreground">{generateOrderId(orders)}</p>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-base gap-2" disabled={createOrder.isPending}>
            {createOrder.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating Order...</>
            ) : (
              <><ShoppingCart className="h-4 w-4" /> Create Order</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
