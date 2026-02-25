import React, { useState, useMemo } from 'react';
import { useGetAllOrders, useGetAllStores, useUpdateOrder } from '../../hooks/useQueries';
import { OrderRecord } from '../../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '../../components/orders/StatusBadge';
import QRCodeDisplay from '../../components/qr/QRCodeDisplay';
import { Search, Filter, Eye, FileText, CheckCircle, XCircle, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { parseOrderMeta, ORDER_STATUSES } from '../../utils/orderUtils';

export default function OrderManagementPage() {
  const { data: orders = [], isLoading } = useGetAllOrders();
  const { data: stores = [] } = useGetAllStores();
  const updateOrder = useUpdateOrder();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const getStoreName = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx]?.storeName ?? `Store #${storeId}`;
  };

  const getStore = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx] ?? null;
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search && !o.orderId.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (storeFilter !== 'all' && String(o.storeId) !== storeFilter) return false;
      if (dateFrom) {
        const ts = Number(o.timestamp) / 1_000_000;
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(ts) < from) return false;
      }
      if (dateTo) {
        const ts = Number(o.timestamp) / 1_000_000;
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(ts) > to) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, storeFilter, dateFrom, dateTo]);

  const handleApprove = async (order: OrderRecord) => {
    if (order.status !== 'Pending Approval') {
      toast.error('Only pending orders can be approved');
      return;
    }
    setApprovingId(order.orderId);
    try {
      const { userNotes, meta } = parseOrderMeta(order.notes);
      const updatedMeta = { ...meta, qrData: btoa(`VITALIST:${order.orderId}`) };
      await updateOrder.mutateAsync({
        orderId: order.orderId,
        updatedOrder: {
          ...order,
          status: 'Approved',
          notes: `${userNotes}||META:${JSON.stringify(updatedMeta)}`,
        },
      });
      toast.success(`Order ${order.orderId} approved and QR generated`);
    } catch (err: unknown) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setApprovingId(null);
    }
  };

  const handleCancel = async (order: OrderRecord) => {
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      toast.error('Cannot cancel a delivered or already cancelled order');
      return;
    }
    setCancellingId(order.orderId);
    try {
      await updateOrder.mutateAsync({
        orderId: order.orderId,
        updatedOrder: { ...order, status: 'Cancelled' },
      });
      toast.success(`Order ${order.orderId} cancelled`);
    } catch (err: unknown) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCancellingId(null);
    }
  };

  const handlePrintInvoice = (order: OrderRecord) => {
    const store = getStore(order.storeId);
    const { userNotes, meta } = parseOrderMeta(order.notes);
    const total = (Number(order.quantity) * order.rate).toFixed(2);
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.orderId}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #1e3a8a; }
          .header { text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
          .subtitle { color: #0ea5e9; font-size: 14px; }
          .invoice-id { font-size: 18px; font-weight: bold; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #1e3a8a; color: white; padding: 10px; text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #dcfce7; color: #166534; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">💧 VITALIST WATER</div>
          <div class="subtitle">Order & Delivery Management System</div>
          <div class="invoice-id">Invoice: ${meta.invoiceNumber || `INV-${order.orderId}`}</div>
        </div>
        <table>
          <tr><th colspan="2">Order Details</th></tr>
          <tr><td>Order ID</td><td><strong>${order.orderId}</strong></td></tr>
          <tr><td>Status</td><td><span class="status">${order.status}</span></td></tr>
          <tr><td>Date</td><td>${new Date(Number(order.timestamp) / 1_000_000).toLocaleString('en-IN')}</td></tr>
          ${store ? `
          <tr><th colspan="2">Store Details</th></tr>
          <tr><td>Store Name</td><td>${store.storeName}</td></tr>
          <tr><td>Owner</td><td>${store.ownerName}</td></tr>
          <tr><td>Mobile</td><td>${store.mobileNumber}</td></tr>
          <tr><td>Address</td><td>${store.address}</td></tr>
          ` : ''}
          <tr><th colspan="2">Order Summary</th></tr>
          <tr><td>Quantity</td><td>${order.quantity.toString()} units</td></tr>
          <tr><td>Rate</td><td>₹${order.rate.toFixed(2)} per unit</td></tr>
          ${userNotes ? `<tr><td>Notes</td><td>${userNotes}</td></tr>` : ''}
        </table>
        <div class="total">Total Amount: ₹${total}</div>
        <div class="footer">
          <p>Generated by Vitalist Water Management System</p>
          <p>${new Date().toLocaleString('en-IN')}</p>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(invoiceHtml);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
        <p className="text-muted-foreground text-sm mt-1">View, filter, approve, and manage all orders</p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card card-shadow p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((s, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>{s.storeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs"
              title="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs"
              title="To date"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {orders.length} orders</span>
          {(search || statusFilter !== 'all' || storeFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setStoreFilter('all'); setDateFrom(''); setDateTo(''); }}
              className="text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Order ID</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Store</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Qty</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Rate</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Total</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold hidden xl:table-cell">Date</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No orders found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <TableRow key={order.orderId} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <span className="font-mono font-semibold text-sm text-foreground">{order.orderId}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{getStoreName(order.storeId)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{order.quantity.toString()}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">₹{order.rate.toFixed(2)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-medium">
                      ₹{(Number(order.quantity) * order.rate).toFixed(2)}
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} size="sm" /></TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                      {new Date(Number(order.timestamp) / 1_000_000).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintInvoice(order)}>
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        {order.status === 'Pending Approval' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleApprove(order)}
                            disabled={approvingId === order.orderId}
                          >
                            {approvingId === order.orderId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleCancel(order)}
                            disabled={cancellingId === order.orderId}
                          >
                            {cancellingId === order.orderId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono">{selectedOrder.orderId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedOrder.status} />
                <span className="text-xs text-muted-foreground">
                  {new Date(Number(selectedOrder.timestamp) / 1_000_000).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Store info */}
              {getStore(selectedOrder.storeId) && (
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Store</p>
                  <p className="font-semibold">{getStore(selectedOrder.storeId)?.storeName}</p>
                  <p className="text-sm text-muted-foreground">{getStore(selectedOrder.storeId)?.ownerName} · {getStore(selectedOrder.storeId)?.mobileNumber}</p>
                  <p className="text-sm text-muted-foreground">{getStore(selectedOrder.storeId)?.address}</p>
                </div>
              )}

              {/* Order details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="text-lg font-bold text-foreground">{selectedOrder.quantity.toString()}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-lg font-bold text-foreground">₹{selectedOrder.rate.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-primary">₹{(Number(selectedOrder.quantity) * selectedOrder.rate).toFixed(2)}</p>
                </div>
              </div>

              {/* Notes */}
              {(() => {
                const { userNotes, meta } = parseOrderMeta(selectedOrder.notes);
                return (
                  <>
                    {userNotes && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm">{userNotes}</p>
                      </div>
                    )}
                    {meta.invoiceNumber && (
                      <div className="text-xs text-muted-foreground">Invoice: {meta.invoiceNumber}</div>
                    )}
                    {/* Stage timestamps */}
                    {(meta.stage1Timestamp || meta.stage2Timestamp || meta.stage3Timestamp || meta.stage4Timestamp) && (
                      <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Workflow Timeline</p>
                        {meta.stage1Timestamp && <p className="text-xs">✅ Packed: {new Date(meta.stage1Timestamp).toLocaleString('en-IN')}</p>}
                        {meta.stage2Timestamp && <p className="text-xs">🚚 Dispatched: {new Date(meta.stage2Timestamp).toLocaleString('en-IN')}</p>}
                        {meta.stage3Timestamp && <p className="text-xs">📍 Out for Delivery: {new Date(meta.stage3Timestamp).toLocaleString('en-IN')}</p>}
                        {meta.stage4Timestamp && <p className="text-xs">🎉 Delivered: {new Date(meta.stage4Timestamp).toLocaleString('en-IN')}</p>}
                      </div>
                    )}
                    {/* QR Code */}
                    {meta.qrData && (
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">QR Code</p>
                        <QRCodeDisplay orderId={selectedOrder.orderId} size={140} />
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => handlePrintInvoice(selectedOrder)}>
                  <FileText className="h-4 w-4" />
                  Print Invoice
                </Button>
                {selectedOrder.status === 'Pending Approval' && (
                  <Button className="flex-1 gap-2" onClick={() => { handleApprove(selectedOrder); setSelectedOrder(null); }}>
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
