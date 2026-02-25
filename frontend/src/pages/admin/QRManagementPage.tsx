import React, { useState } from 'react';
import { useAllOrders, useAllStores } from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '@/components/ui/input';
import StatusBadge from '../../components/orders/StatusBadge';
import QRCodeDisplay from '../../components/qr/QRCodeDisplay';
import { Search } from 'lucide-react';

export default function QRManagementPage() {
  const { user } = useAuth();
  const sessionEmail = user?.email ?? '';

  const { data: orders = [], isLoading } = useAllOrders(sessionEmail);
  const { data: stores = [] } = useAllStores(sessionEmail);
  const [search, setSearch] = useState('');

  // Show orders that have a QR code generated (stored in order.qrCode field)
  const ordersWithQR = orders.filter((o) => {
    return o.qrCode != null && o.status !== 'Cancelled';
  });

  const filtered = ordersWithQR.filter((o) =>
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
        <p className="text-muted-foreground text-sm mt-1">View and manage QR codes for orders assigned to delivery</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Total QR Codes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{ordersWithQR.length}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Active QRs</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {ordersWithQR.filter((o) => o.status !== 'Delivered').length}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {ordersWithQR.filter((o) => o.status === 'Delivered').length}
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
          <p className="text-muted-foreground text-sm">
            {search ? 'No QR codes match your search.' : 'No QR codes generated yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <div key={order.orderId} className="rounded-xl border border-border bg-card p-5 card-shadow">
              <div className="flex flex-col items-center gap-3">
                {/* QRCodeDisplay uses orderId to generate the QR image URL internally */}
                <QRCodeDisplay
                  orderId={order.qrCode?.value ?? order.orderId}
                />
                <div className="text-center">
                  <p className="font-mono font-semibold text-sm text-foreground">{order.orderId}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{getStoreName(order.storeId)}</p>
                  {order.qrCode?.scanTimestamp && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Scanned: {new Date(Number(order.qrCode.scanTimestamp) / 1_000_000).toLocaleString()}
                    </p>
                  )}
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
