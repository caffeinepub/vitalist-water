import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer } from 'lucide-react';
import { generateQRCodeURL } from '../../utils/qrGenerator';
import type { OrderRecord, Store } from '../../backend';

interface InvoiceViewProps {
  order: OrderRecord;
  store: Store | null;
}

export default function InvoiceView({ order, store }: InvoiceViewProps) {
  const [qrError, setQrError] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(Number(order.timestamp) / 1_000_000).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const quantity = Number(order.quantity);
  const rate = Number(order.rate);
  const subtotal = quantity * rate;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  // Determine QR code value: prefer stored qrCode.value, fallback to orderId
  const qrValue = order.qrCode?.value ?? order.orderId;
  const qrImageUrl = generateQRCodeURL(qrValue, 150);

  return (
    <div className="invoice-container p-6 bg-white text-gray-900 font-sans">
      {/* Print Button - hidden during print */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Print Invoice
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/assets/generated/vitalist-logo.dim_320x80.png"
              alt="Vitalist"
              className="h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <p className="text-sm text-gray-500">Vitalist Distribution Pvt. Ltd.</p>
          <p className="text-sm text-gray-500">GSTIN: 29ABCDE1234F1Z5</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">Invoice No:</span> {order.orderId}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Date:</span> {invoiceDate}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Status:</span>{' '}
            <span className="font-semibold text-primary">{order.status}</span>
          </p>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Bill To
          </h3>
          {store ? (
            <div className="text-sm space-y-1">
              <p className="font-semibold text-gray-800">{store.storeName}</p>
              <p className="text-gray-600">{store.ownerName}</p>
              <p className="text-gray-600">{store.address}</p>
              {store.landmark && (
                <p className="text-gray-600">Near: {store.landmark}</p>
              )}
              <p className="text-gray-600">📞 {store.mobileNumber}</p>
            </div>
          ) : (
            <div className="text-sm space-y-1">
              <p className="text-gray-500 italic">Store ID: {String(order.storeId)}</p>
              <p className="text-gray-400 text-xs">Store details not available</p>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Ship To
          </h3>
          {store ? (
            <div className="text-sm space-y-1">
              <p className="font-semibold text-gray-800">{store.storeName}</p>
              <p className="text-gray-600">{store.address}</p>
              {store.latitude && store.longitude && (
                <p className="text-gray-500 text-xs">
                  GPS: {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                </p>
              )}
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-gray-400 text-xs">Delivery address not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 border border-gray-200 font-semibold">#</th>
              <th className="text-left p-3 border border-gray-200 font-semibold">Description</th>
              <th className="text-right p-3 border border-gray-200 font-semibold">Qty</th>
              <th className="text-right p-3 border border-gray-200 font-semibold">Rate (₹)</th>
              <th className="text-right p-3 border border-gray-200 font-semibold">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border border-gray-200">1</td>
              <td className="p-3 border border-gray-200">
                <p className="font-medium">Product Order</p>
                {order.notes && (
                  <p className="text-gray-500 text-xs mt-1">{order.notes}</p>
                )}
              </td>
              <td className="p-3 border border-gray-200 text-right">{quantity}</td>
              <td className="p-3 border border-gray-200 text-right">
                ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="p-3 border border-gray-200 text-right">
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">GST (18%)</span>
            <span>₹{gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* QR Code + Footer */}
      <div className="flex items-start justify-between">
        <div className="text-xs text-gray-500 max-w-xs">
          <p className="font-semibold text-gray-700 mb-1">Terms & Conditions</p>
          <p>Payment due within 30 days of invoice date.</p>
          <p>Goods once sold will not be taken back.</p>
          <p>Subject to local jurisdiction.</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2 font-medium">Order QR Code</p>
          {!qrError ? (
            <img
              src={qrImageUrl}
              alt={`QR Code for ${order.orderId}`}
              className="w-32 h-32 border border-gray-200 rounded"
              onError={() => setQrError(true)}
            />
          ) : (
            <div className="w-32 h-32 border border-gray-200 rounded flex items-center justify-center bg-gray-50">
              <p className="text-xs text-gray-400 text-center px-2">QR unavailable</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">{order.orderId}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          .invoice-container { padding: 0; }
        }
      `}</style>
    </div>
  );
}
