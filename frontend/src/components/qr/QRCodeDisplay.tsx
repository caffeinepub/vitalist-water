import React, { useState } from 'react';
import { generateQRCodeURL } from '../../utils/qrGenerator';

interface QRCodeDisplayProps {
  orderId: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ orderId, size = 200, className = '' }: QRCodeDisplayProps) {
  const [imgError, setImgError] = useState(false);

  if (!orderId) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border border-gray-200 rounded text-gray-400 text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        No Order ID
      </div>
    );
  }

  const qrUrl = generateQRCodeURL(orderId, size);

  if (imgError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 border border-gray-200 rounded text-gray-400 text-xs p-2 ${className}`}
        style={{ width: size, height: size }}
      >
        <span>QR unavailable</span>
        <span className="mt-1 text-center break-all">{orderId}</span>
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt={`QR Code for order ${orderId}`}
      width={size}
      height={size}
      className={`border border-gray-200 rounded ${className}`}
      onError={() => setImgError(true)}
    />
  );
}
