import React, { useState, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAllOrders, useApproveOrder, useAllStores } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { AlertCircle, Loader2, Printer } from 'lucide-react';
import type { OrderRecord } from '../../backend';
import QRPrintView from '../../components/orders/QRPrintView';

const ORDER_STATUSES = [
  'All',
  'Pending Approval',
  'Approved',
  'Ready',
  'Assigned to Delivery',
  'Dispatched',
  'Out for Delivery',
  'Trucks in Transit',
  'Distributor Confirmations Pending',
  'Delivered',
];

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  'Pending Approval': ['Approved', 'Rejected'],
  'Approved': ['Assigned to Delivery'],
  'Assigned to Delivery': ['Dispatched'],
};

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Delivered': return 'default';
    case 'Pending Approval': return 'secondary';
    case 'Rejected': return 'destructive';
    default: return 'outline';
  }
}

export default function OrderManagementPage() {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const [statusFilter, setStatusFilter] = useState('All');
  const [printOrder, setPrintOrder] = useState<OrderRecord | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data: orders = [], isLoading, error } = useAllOrders(email);
  const { data: stores = [] } = useAllStores(email);
  const approveOrderMutation = useApproveOrder();

  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    if (statusFilter === 'All') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const getStoreName = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx]?.storeName ?? `Store #${storeId}`;
  };

  const handleApprove = async (orderId: string, newStatus: string) => {
    if (!email) return;
    setApprovingId(orderId);
    try {
      await approveOrderMutation.mutateAsync({ orderId, newStatus, sessionEmail: email });
    } catch (err) {
      console.error('Approve order error:', err);
    } finally {
      setApprovingId(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>Failed to load orders. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Orders{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({filteredOrders.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No orders found.</p>
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
                    <TableHead>Status</TableHead>
                    <TableHead>QR</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const transitions = ADMIN_TRANSITIONS[order.status] ?? [];
                    const isApproving = approvingId === order.orderId;
                    return (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                        <TableCell className="text-sm">{getStoreName(order.storeId)}</TableCell>
                        <TableCell>{Number(order.quantity)}</TableCell>
                        <TableCell>₹{order.rate}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.qrCode ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPrintOrder(order)}
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Print
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {transitions.map((t) => (
                              <Button
                                key={t}
                                size="sm"
                                variant={t === 'Rejected' ? 'destructive' : 'default'}
                                disabled={isApproving}
                                onClick={() => handleApprove(order.orderId, t)}
                              >
                                {isApproving ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  t
                                )}
                              </Button>
                            ))}
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

      {/* QR Print Modal */}
      {printOrder && (
        <QRPrintView
          orderId={printOrder.orderId}
          qrCodeValue={printOrder.qrCode?.value ?? printOrder.orderId}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}
