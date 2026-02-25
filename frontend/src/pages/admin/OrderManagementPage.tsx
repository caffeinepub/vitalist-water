import React, { useState } from 'react';
import { useAllOrders, useUpdateOrder, useAllStores } from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { OrderRecord } from '../../backend';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Truck, Package, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  'Pending Approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Approved': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Dispatched': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Out for Delivery': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function OrderManagementPage() {
  const { actor, isFetching: actorFetching } = useActor();
  const { data: orders = [], isLoading: ordersLoading } = useAllOrders();
  const { data: stores = [] } = useAllStores();
  const updateOrderMutation = useUpdateOrder();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  const actorReady = !!actor && !actorFetching;

  const getStoreName = (storeId: bigint) => {
    const store = stores.find((s, idx) => BigInt(idx + 1) === storeId);
    return store?.storeName ?? `Store #${storeId}`;
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      getStoreName(o.storeId).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (order: OrderRecord, newStatus: string) => {
    if (!actorReady) {
      toast.error('System is initializing. Please wait a moment and try again.');
      return;
    }
    setLoadingOrderId(order.orderId);
    try {
      await updateOrderMutation.mutateAsync({
        orderId: order.orderId,
        order: { ...order, status: newStatus },
      });
      toast.success(`Order ${order.orderId} status updated to ${newStatus}`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('Unauthorized') || msg.includes('permission')) {
        toast.error('Permission denied. Please log out and log back in.');
      } else {
        toast.error(`Failed to update order: ${msg}`);
      }
    } finally {
      setLoadingOrderId(null);
    }
  };

  const isLoading = ordersLoading || actorFetching;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Approve, dispatch, and manage all orders</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Pending Approval', 'Approved', 'Dispatched', 'Delivered'].map((status) => (
          <Card key={status} className="card-shadow">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{status}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {orders.filter((o) => o.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', 'Pending Approval', 'Approved', 'Dispatched', 'Delivered', 'Cancelled'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">
            Orders ({filteredOrders.length})
            {!actorReady && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                <Loader2 className="inline w-3 h-3 animate-spin mr-1" />
                Initializing…
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const isRowLoading = loadingOrderId === order.orderId;
                    return (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                        <TableCell>{getStoreName(order.storeId)}</TableCell>
                        <TableCell>{order.quantity.toString()}</TableCell>
                        <TableCell>₹{order.rate.toFixed(2)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {order.status === 'Pending Approval' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  disabled={isRowLoading || !actorReady}
                                  onClick={() => handleStatusChange(order, 'Approved')}
                                >
                                  {isRowLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  disabled={isRowLoading || !actorReady}
                                  onClick={() => handleStatusChange(order, 'Cancelled')}
                                >
                                  {isRowLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  )}
                                  Cancel
                                </Button>
                              </>
                            )}
                            {order.status === 'Approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                disabled={isRowLoading || !actorReady}
                                onClick={() => handleStatusChange(order, 'Dispatched')}
                              >
                                {isRowLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Truck className="w-3 h-3 mr-1" />
                                )}
                                Dispatch
                              </Button>
                            )}
                            {order.status === 'Dispatched' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                disabled={isRowLoading || !actorReady}
                                onClick={() => handleStatusChange(order, 'Out for Delivery')}
                              >
                                {isRowLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Package className="w-3 h-3 mr-1" />
                                )}
                                Out for Delivery
                              </Button>
                            )}
                            {order.status === 'Out for Delivery' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                disabled={isRowLoading || !actorReady}
                                onClick={() => handleStatusChange(order, 'Delivered')}
                              >
                                {isRowLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                Delivered
                              </Button>
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
    </div>
  );
}
