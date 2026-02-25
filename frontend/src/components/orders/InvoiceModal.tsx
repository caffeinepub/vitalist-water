import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAllOrders, useAllStores } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import InvoiceView from './InvoiceView';
import { Skeleton } from '@/components/ui/skeleton';
import { Store } from '@/backend';

interface InvoiceModalProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function InvoiceModal({ orderId, open, onClose }: InvoiceModalProps) {
  const { user } = useAuth();
  const sessionEmail = user?.email ?? '';

  const { data: orders, isLoading: ordersLoading } = useAllOrders(sessionEmail);
  const { data: stores, isLoading: storesLoading } = useAllStores(sessionEmail);

  const order = orders?.find((o) => o.orderId === orderId);

  // stores are indexed by Nat (1-based), storeId is bigint
  const storeById: Store | null = (() => {
    if (!order || !stores) return null;
    const id = Number(order.storeId);
    return stores[id - 1] ?? null;
  })();

  const isLoading = ordersLoading || storesLoading;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle>Invoice — {orderId}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : order ? (
          <InvoiceView order={order} store={storeById} />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Order not found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
