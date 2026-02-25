import React from 'react';
import { getQRImageUrl } from '../../utils/qrGenerator';

interface QRCodeDisplayProps {
  orderId: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ orderId, size = 160, className = '' }: QRCodeDisplayProps) {
  const url = getQRImageUrl(orderId, size);
  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className="p-3 bg-white rounded-xl border border-border shadow-xs">
        <img
          src={url}
          alt={`QR Code for ${orderId}`}
          width={size}
          height={size}
          className="block"
          onError={(e) => {
            // Fallback: show order ID text
            const target = e.currentTarget;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = 'flex items-center justify-center text-xs text-muted-foreground font-mono';
              fallback.style.width = `${size}px`;
              fallback.style.height = `${size}px`;
              fallback.textContent = orderId;
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
      <p className="text-xs font-mono text-muted-foreground">{orderId}</p>
    </div>
  );
}
