import React, { useState } from 'react';
import { useGetAllOrders, useGetAllStores } from '../../hooks/useQueries';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import StatusBadge from '../../components/orders/StatusBadge';
import QRCodeDisplay from '../../components/qr/QRCodeDisplay';
import { Search, QrCode, Package, CheckCircle } from 'lucide-react';
import { parseOrderMeta } from '../../utils/orderUtils';

export default function QRManagementPage() {
  const { data: orders = [], isLoading } = useGetAllOrders();
  const { data: stores = [] } = useGetAllStores();
  const [search, setSearch] = useState('');

  const approvedOrders = orders.filter((o) => {
    const { meta } = parseOrderMeta(o.notes);
    return meta.qrData && o.status !== 'Cancelled';
  });

  const filtered = approvedOrders.filter((o) =>
    o.orderId.toLowerCase().includes(search.toLowerCase())
  );

  const getStoreName = (storeId: bigint) => {
    const idx = Number(storeId) - 1;
    return stores[idx]?.storeName ?? `Store #${storeId}`;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">QR Management</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage QR codes for approved orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Total QR Codes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{approvedOrders.length}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Active QRs</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {approvedOrders.filter((o) => o.status !== 'Delivered').length}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {approvedOrders.filter((o) => o.status === 'Delivered').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* QR Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-40 bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded w-24 mx-auto" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-foreground">
            {search ? 'No QR codes match your search' : 'No QR codes generated yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {!search && 'Approve orders to generate QR codes'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <div key={order.orderId} className="rounded-xl border border-border bg-card card-shadow p-5 flex flex-col items-center gap-3">
              <QRCodeDisplay orderId={order.orderId} size={160} />
              <div className="text-center w-full">
                <p className="font-mono font-bold text-sm text-foreground">{order.orderId}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getStoreName(order.storeId)}</p>
                <div className="mt-2 flex justify-center">
                  <StatusBadge status={order.status} size="sm" />
                </div>
              </div>
              {order.status === 'Delivered' && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Order Completed
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
