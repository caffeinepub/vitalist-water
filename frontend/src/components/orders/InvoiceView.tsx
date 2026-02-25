import React from 'react';
import { OrderRecord, Store } from '@/backend';
import { generateInvoiceNumber } from '@/utils/orderUtils';
import QRCodeDisplay from '@/components/qr/QRCodeDisplay';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvoiceViewProps {
  order: OrderRecord;
  store?: Store | null;
  storeId?: number;
}

export default function InvoiceView({ order, store }: InvoiceViewProps) {
  const invoiceNumber = generateInvoiceNumber(order.orderId);
  const createdAt = new Date(Number(order.timestamp) / 1_000_000);
  const total = Number(order.quantity) * order.rate;
  const hasQR = !!order.qrCode;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Print button - hidden in print */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Download / Print Invoice
        </Button>
      </div>

      {/* Invoice document */}
      <div
        id="invoice-document"
        className="bg-white text-gray-900 p-8 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto print:shadow-none print:border-none print:rounded-none print:max-w-full"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <img
              src="/assets/generated/vitalist-logo.dim_320x80.png"
              alt="Vitalist Water"
              className="h-12 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-blue-700">INVOICE</h1>
            <p className="text-sm text-gray-500 mt-1">{invoiceNumber}</p>
            <p className="text-sm text-gray-500">
              {createdAt.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <p className="text-xs text-gray-400">
              {createdAt.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">From</h3>
            <p className="font-semibold text-gray-800">Vitalist Water</p>
            <p className="text-sm text-gray-600">Enterprise Distribution</p>
            <p className="text-sm text-gray-600">shajan@vitalist.com</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
            {store ? (
              <>
                <p className="font-semibold text-gray-800">{store.storeName}</p>
                <p className="text-sm text-gray-600">{store.ownerName}</p>
                <p className="text-sm text-gray-600">{store.mobileNumber}</p>
                <p className="text-sm text-gray-600">{store.address}</p>
                {store.landmark && (
                  <p className="text-sm text-gray-500">Near: {store.landmark}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Store #{order.storeId.toString()}</p>
            )}
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Order ID</span>
            <p className="font-mono font-semibold text-blue-700">{order.orderId}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Status</span>
            <p className="font-semibold text-gray-700">{order.status}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">
                Description
              </th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">
                Qty
              </th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">
                Rate (₹)
              </th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">
                Amount (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-4">
                <p className="font-medium text-gray-800">Vitalist Water Supply</p>
                {order.notes && (
                  <p className="text-sm text-gray-500 mt-1">{order.notes}</p>
                )}
              </td>
              <td className="py-4 text-right font-medium">{order.quantity.toString()}</td>
              <td className="py-4 text-right font-medium">₹{order.rate.toFixed(2)}</td>
              <td className="py-4 text-right font-semibold">₹{total.toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-4 text-right font-semibold text-gray-700">
                Total Amount:
              </td>
              <td className="pt-4 text-right text-xl font-bold text-blue-700">
                ₹{total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* QR Code Section */}
        <div className="border-t border-gray-200 pt-6 flex items-start gap-6">
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              QR Code
            </h3>
            {hasQR ? (
              <div className="flex flex-col items-start gap-2">
                <QRCodeDisplay orderId={order.qrCode!.value} size={100} />
                <p className="text-xs text-gray-500">Scan to verify order</p>
                {order.qrCode?.scanned && order.qrCode.scanTimestamp && (
                  <p className="text-xs text-green-600">
                    ✓ Scanned at{' '}
                    {new Date(Number(order.qrCode.scanTimestamp) / 1_000_000).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <p className="text-xs text-gray-400 font-medium">Pending</p>
                  <p className="text-xs text-gray-400">Approval</p>
                </div>
              </div>
            )}
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Vitalist Water Enterprise</p>
            <p>Distribution Management System</p>
            <p className="mt-1">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
