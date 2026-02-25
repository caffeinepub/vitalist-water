import React from 'react';

interface QRPrintViewProps {
  orderId: string;
  qrCodeValue: string;
  onClose?: () => void;
}

export default function QRPrintView({ orderId, qrCodeValue, onClose }: QRPrintViewProps) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeValue)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-content { 
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
        }
      `}</style>
      <div className="print-content flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-gray-900 no-print">QR Code Print Preview</h1>
        <div className="border-4 border-gray-800 p-6 rounded-lg bg-white shadow-lg">
          <img
            src={qrImageUrl}
            alt={`QR Code for Order ${orderId}`}
            className="w-64 h-64"
          />
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 font-medium">Order ID</p>
            <p className="text-xl font-bold text-gray-900 font-mono">{orderId}</p>
          </div>
        </div>
        <div className="no-print flex gap-4 mt-4">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Print QR Code
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
