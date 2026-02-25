import React, { useEffect, useRef } from 'react';
import { useQRScanner } from '../../qr-code/useQRScanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RotateCcw, X, CheckCircle, AlertCircle } from 'lucide-react';
import { decodeQRData } from '../../utils/orderUtils';

interface QRScanModalProps {
  open: boolean;
  onClose: () => void;
  onScanned: (orderId: string) => void;
  title?: string;
  description?: string;
}

export default function QRScanModal({ open, onClose, onScanned, title = 'Scan QR Code', description }: QRScanModalProps) {
  const {
    qrResults,
    isScanning,
    isActive,
    isSupported,
    error,
    isLoading,
    canStartScanning,
    startScanning,
    stopScanning,
    switchCamera,
    clearResults,
    videoRef,
    canvasRef,
    reset,
  } = useQRScanner({ facingMode: 'environment', scanInterval: 150, maxResults: 3 });

  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      processedRef.current = null;
      clearResults();
      startScanning();
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (qrResults.length > 0 && processedRef.current === null) {
      const latest = qrResults[0];
      const orderId = decodeQRData(latest.data);
      if (orderId) {
        processedRef.current = orderId;
        stopScanning();
        setTimeout(() => {
          onScanned(orderId);
          onClose();
        }, 800);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrResults]);

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Camera preview */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square w-full max-w-sm mx-auto" style={{ minHeight: '280px' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/80 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                  {isScanning && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan-400 animate-bounce" style={{ animationDuration: '1.5s' }} />
                  )}
                </div>
              </div>
            )}

            {/* Success overlay */}
            {processedRef.current && (
              <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                <div className="text-center text-white">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-semibold">QR Scanned!</p>
                  <p className="text-sm opacity-90">{processedRef.current}</p>
                </div>
              </div>
            )}

            {/* Not active state */}
            {!isActive && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <CameraOff className="h-10 w-10 mx-auto mb-2 opacity-60" />
                  <p className="text-sm opacity-80">Camera inactive</p>
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error.message}</span>
            </div>
          )}

          {isSupported === false && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Camera not supported on this device/browser.</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {!isActive ? (
              <Button
                onClick={startScanning}
                disabled={!canStartScanning || isLoading}
                className="flex-1 gap-2"
              >
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={stopScanning}
                disabled={isLoading}
                className="flex-1 gap-2"
              >
                <CameraOff className="h-4 w-4" />
                Stop
              </Button>
            )}
            {isMobile && isActive && (
              <Button variant="outline" size="icon" onClick={switchCamera} disabled={isLoading}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => { reset(); onClose(); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Point the camera at a Vitalist Water QR code to scan automatically
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
