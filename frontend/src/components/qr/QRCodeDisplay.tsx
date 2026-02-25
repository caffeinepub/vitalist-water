import React, { useState } from 'react';
import { getQRImageUrl } from '../../utils/qrGenerator';

interface QRCodeDisplayProps {
  orderId: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ orderId, size = 160, className = '' }: QRCodeDisplayProps) {
  const [imgError, setImgError] = useState(false);

  if (!orderId) {
    return (
      <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
        <div
          className="p-3 bg-white rounded-xl border border-border shadow-xs flex items-center justify-center text-xs text-muted-foreground"
          style={{ width: size + 24, height: size + 24 }}
        >
          No QR data
        </div>
      </div>
    );
  }

  const url = getQRImageUrl(orderId, size);

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className="p-3 bg-white rounded-xl border border-border shadow-xs">
        {imgError ? (
          <div
            className="flex items-center justify-center text-xs text-muted-foreground font-mono break-all text-center"
            style={{ width: size, height: size }}
          >
            {orderId}
          </div>
        ) : (
          <img
            src={url}
            alt={`QR Code for ${orderId}`}
            width={size}
            height={size}
            className="block"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <p className="text-xs font-mono text-muted-foreground">{orderId}</p>
    </div>
  );
}
