import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { generateQRCodeURL } from '../../utils/qrGenerator';

interface QRPrintViewProps {
  orderId: string;
  qrCodeValue?: string;
}

export default function QRPrintView({ orderId, qrCodeValue }: QRPrintViewProps) {
  const [imgError, setImgError] = useState(false);

  // Use the stored qrCode value if provided, otherwise use orderId
  const valueToEncode = qrCodeValue ?? orderId;
  const qrUrl = generateQRCodeURL(valueToEncode, 250);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="print:block">
        <div className="flex flex-col items-center gap-3 p-6 border border-gray-200 rounded-lg bg-white">
          <img
            src="/assets/generated/vitalist-logo.dim_320x80.png"
            alt="Vitalist"
            className="h-8 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="text-sm font-semibold text-gray-700">Order QR Code</p>

          {!imgError ? (
            <img
              src={qrUrl}
              alt={`QR Code for ${orderId}`}
              className="w-48 h-48 border border-gray-200"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-48 h-48 border border-gray-200 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-xs text-gray-400 text-center px-4">
                QR code could not be loaded
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500 font-mono">{orderId}</p>
          </div>
        </div>
      </div>

      <Button
        onClick={handlePrint}
        variant="outline"
        size="sm"
        className="gap-2 print:hidden"
      >
        <Printer className="h-4 w-4" />
        Print QR Code
      </Button>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
