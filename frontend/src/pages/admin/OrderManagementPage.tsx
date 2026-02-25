import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Eye, Printer, Truck, CheckCircle, XCircle,
  ChevronDown, Filter, RefreshCw, QrCode, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import InvoiceModal from '../../components/orders/InvoiceModal';
import QRPrintView from '../../components/orders/QRPrintView';
import {
  useAllOrders, useAllUsers, useApproveOrder, useAssignDelivery
} from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import { getStatusColor } from '../../utils/orderUtils';
import type { OrderRecord } from '../../backend';
import { Principal } from '@dfinity/principal';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_OPTIONS = [
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

export default function OrderManagementPage() {
  const { sessionEmail } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [qrPrintOrder, setQrPrintOrder] = useState<OrderRecord | null>(null);
  const [assignDeliveryOrder, setAssignDeliveryOrder] = useState<OrderRecord | null>(null);
  const [selectedDeliveryUser, setSelectedDeliveryUser] = useState<string>('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const { data: orders, isLoading: ordersLoading, error: ordersError, refetch } = useAllOrders(sessionEmail);
  const { data: users } = useAllUsers(sessionEmail);

  const approveOrderMutation = useApproveOrder();
  const assignDeliveryMutation = useAssignDelivery();

  const deliveryUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => u.role === 'delivery');
  }, [users]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleApprove = async (order: OrderRecord, newStatus: string) => {
    try {
      await approveOrderMutation.mutateAsync({ orderId: order.orderId, newStatus, sessionEmail });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      console.error('Failed to approve order:', err);
    }
  };

  const handleAssignDelivery = async () => {
    if (!assignDeliveryOrder || !selectedDeliveryUser) return;
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const principal = Principal.fromText(selectedDeliveryUser);
      await assignDeliveryMutation.mutateAsync({
        orderId: assignDeliveryOrder.orderId,
        deliveryUser: principal,
        sessionEmail,
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });

      setAssignSuccess(`Order ${assignDeliveryOrder.orderId} assigned successfully!`);
      setTimeout(() => {
        setAssignDeliveryOrder(null);
        setSelectedDeliveryUser('');
        setAssignSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign delivery';
      setAssignError(message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track all orders
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {ordersLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {ordersError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>Failed to load orders. Please refresh.</AlertDescription>
        </Alert>
      )}

      {!ordersLoading && !ordersError && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>{String(order.quantity)}</TableCell>
                        <TableCell>₹{order.rate}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {order.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1">
                                Actions <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setInvoiceOrderId(order.orderId)}>
                                <Printer className="h-4 w-4 mr-2" />
                                View Invoice
                              </DropdownMenuItem>
                              {order.qrCode && (
                                <DropdownMenuItem onClick={() => setQrPrintOrder(order)}>
                                  <QrCode className="h-4 w-4 mr-2" />
                                  Print QR Code
                                </DropdownMenuItem>
                              )}
                              {order.status === 'Pending Approval' && (
                                <DropdownMenuItem onClick={() => handleApprove(order, 'Approved')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Order
                                </DropdownMenuItem>
                              )}
                              {order.status === 'Approved' && (
                                <DropdownMenuItem onClick={() => {
                                  setAssignDeliveryOrder(order);
                                  setSelectedDeliveryUser('');
                                  setAssignError(null);
                                  setAssignSuccess(null);
                                }}>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Assign to Delivery
                                </DropdownMenuItem>
                              )}
                              {['Approved', 'Ready', 'Assigned to Delivery'].includes(order.status) && (
                                <DropdownMenuItem
                                  onClick={() => handleApprove(order, getNextStatus(order.status))}
                                >
                                  <Truck className="h-4 w-4 mr-2" />
                                  Advance Status
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Order ID:</span> <span className="font-mono font-medium">{selectedOrder.orderId}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{selectedOrder.status}</span></div>
                <div><span className="text-muted-foreground">Quantity:</span> <span>{String(selectedOrder.quantity)}</span></div>
                <div><span className="text-muted-foreground">Rate:</span> <span>₹{selectedOrder.rate}</span></div>
                <div><span className="text-muted-foreground">Store ID:</span> <span>{String(selectedOrder.storeId)}</span></div>
                <div><span className="text-muted-foreground">QR Code:</span> <span>{selectedOrder.qrCode ? '✅ Generated' : '❌ Not yet'}</span></div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1 bg-muted/50 rounded p-2">{selectedOrder.notes}</p>
                </div>
              )}
              {selectedOrder.assignedDeliveryUser && (
                <div>
                  <span className="text-muted-foreground">Assigned To:</span>
                  <p className="font-mono text-xs mt-1">{selectedOrder.assignedDeliveryUser.toString()}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Delivery Dialog */}
      <Dialog
        open={!!assignDeliveryOrder}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDeliveryOrder(null);
            setSelectedDeliveryUser('');
            setAssignError(null);
            setAssignSuccess(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Delivery User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Order: <span className="font-mono font-medium">{assignDeliveryOrder?.orderId}</span>
            </p>

            {assignError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{assignError}</AlertDescription>
              </Alert>
            )}
            {assignSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{assignSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Delivery User</label>
              <Select value={selectedDeliveryUser} onValueChange={setSelectedDeliveryUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a delivery user..." />
                </SelectTrigger>
                <SelectContent>
                  {deliveryUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: The delivery user must be logged in via Internet Identity. Their principal ID is used for assignment.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDeliveryOrder(null);
                setSelectedDeliveryUser('');
                setAssignError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignDelivery}
              disabled={!selectedDeliveryUser || assignDeliveryMutation.isPending}
            >
              {assignDeliveryMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Print Dialog */}
      <Dialog open={!!qrPrintOrder} onOpenChange={(open) => { if (!open) setQrPrintOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Print QR Code</DialogTitle>
          </DialogHeader>
          {qrPrintOrder && (
            <QRPrintView
              orderId={qrPrintOrder.orderId}
              qrCodeValue={qrPrintOrder.qrCode?.value}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      <InvoiceModal
        orderId={invoiceOrderId}
        open={!!invoiceOrderId}
        onClose={() => setInvoiceOrderId(null)}
      />
    </div>
  );
}

function getNextStatus(currentStatus: string): string {
  const transitions: Record<string, string> = {
    'Approved': 'Ready',
    'Ready': 'Assigned to Delivery',
    'Assigned to Delivery': 'Dispatched',
  };
  return transitions[currentStatus] ?? currentStatus;
}
