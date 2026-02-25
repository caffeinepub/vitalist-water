import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import InvoiceView from './InvoiceView';
import { useAllOrders, useAllStores } from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import type { OrderRecord, Store } from '../../backend';

interface InvoiceModalProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function InvoiceModal({ orderId, open, onClose }: InvoiceModalProps) {
  const { sessionEmail } = useAuth();

  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useAllOrders(sessionEmail);

  const {
    data: stores,
    isLoading: storesLoading,
    error: storesError,
  } = useAllStores(sessionEmail);

  const order: OrderRecord | null = React.useMemo(() => {
    if (!orders || !orderId) return null;
    return orders.find((o) => o.orderId === orderId) ?? null;
  }, [orders, orderId]);

  const store: Store | null = React.useMemo(() => {
    if (!stores || !order) return null;
    const storeIdNum = Number(order.storeId);
    // stores array is 0-indexed but storeId is 1-indexed
    return stores[storeIdNum - 1] ?? stores.find((_, idx) => idx + 1 === storeIdNum) ?? null;
  }, [stores, order]);

  const isLoading = ordersLoading || storesLoading;
  const hasError = ordersError || storesError;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice — {orderId ?? ''}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {!isLoading && hasError && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load invoice data. Please close and try again.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && !order && orderId && (
          <Alert className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Order <strong>{orderId}</strong> not found.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && order && (
          <InvoiceView order={order} store={store} />
        )}
      </DialogContent>
    </Dialog>
  );
}
