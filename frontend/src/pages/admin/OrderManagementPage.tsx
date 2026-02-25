import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGetAllOrders, useUpdateOrder, useGetAllStores } from '../../hooks/useQueries';
import type { OrderRecord } from '../../backend';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  cancelled: 'destructive',
  dispatched: 'outline',
  delivered: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  cancelled: 'Cancelled',
  dispatched: 'Dispatched',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
};

export default function OrderManagementPage() {
  const { data: orders = [], isLoading } = useGetAllOrders();
  const { data: stores = [] } = useGetAllStores();
  const updateOrder = useUpdateOrder();

  const [search, setSearch] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const getStoreName = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx]?.storeName || `Store #${storeId}`;
  };

  const handleApprove = async (order: OrderRecord) => {
    setApprovingId(order.orderId);
    try {
      await updateOrder.mutateAsync({
        orderId: order.orderId,
        order: { ...order, status: 'approved' },
      });
      toast.success(`Order ${order.orderId} approved`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Only admins') || msg.includes('Unauthorized')) {
        toast.error('Permission denied: Only admins can approve orders.');
      } else {
        toast.error(`Failed to approve order: ${msg}`);
      }
    } finally {
      setApprovingId(null);
    }
  };

  const openCancelDialog = (orderId: string) => {
    setCancellingOrderId(orderId);
    setCancelDialogOpen(true);
  };

  const handleCancel = async () => {
    if (!cancellingOrderId) return;
    const order = orders.find((o) => o.orderId === cancellingOrderId);
    if (!order) return;

    try {
      await updateOrder.mutateAsync({
        orderId: order.orderId,
        order: { ...order, status: 'cancelled' },
      });
      toast.success(`Order ${order.orderId} cancelled`);
      setCancelDialogOpen(false);
      setCancellingOrderId(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Only admins') || msg.includes('Unauthorized')) {
        toast.error('Permission denied: Only admins can cancel orders.');
      } else {
        toast.error(`Failed to cancel order: ${msg}`);
      }
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      getStoreName(o.storeId).toLowerCase().includes(search.toLowerCase()) ||
      o.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and manage all orders</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">
              All Orders ({filteredOrders.length})
            </CardTitle>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const isApproving = approvingId === order.orderId;
                    const isCancelling = updateOrder.isPending && cancellingOrderId === order.orderId;
                    const total = (Number(order.quantity) * order.rate).toFixed(2);

                    return (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-sm font-medium">{order.orderId}</TableCell>
                        <TableCell className="text-sm">{getStoreName(order.storeId)}</TableCell>
                        <TableCell>{Number(order.quantity)}</TableCell>
                        <TableCell>₹{order.rate.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">₹{total}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[order.status] || 'outline'}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                          {order.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(order)}
                                disabled={isApproving || updateOrder.isPending}
                                className="h-8 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                {isApproving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Approve
                              </Button>
                            )}
                            {(order.status === 'pending' || order.status === 'approved') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCancelDialog(order.orderId)}
                                disabled={isCancelling || updateOrder.isPending}
                                className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                {isCancelling ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                Cancel
                              </Button>
                            )}
                            {order.status !== 'pending' && order.status !== 'approved' && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order <strong>{cancellingOrderId}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateOrder.isPending}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={updateOrder.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateOrder.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
