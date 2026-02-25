import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, SwitchCamera, X, AlertCircle, Loader2 } from 'lucide-react';
// @ts-ignore - prefabricated component
import { useQRScanner } from '../../qr-code/useQRScanner';

interface QRScanModalProps {
  open: boolean;
  onClose: () => void;
  onScanned: (value: string) => void;
  title?: string;
}

export default function QRScanModal({
  open,
  onClose,
  onScanned,
  title = 'Scan QR Code',
}: QRScanModalProps) {
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
  } = useQRScanner({
    facingMode: 'environment',
    scanInterval: 200,
    maxResults: 1,
  });

  const hasProcessedRef = useRef(false);

  // Start scanning when modal opens
  useEffect(() => {
    if (open) {
      hasProcessedRef.current = false;
      clearResults();
      const timer = setTimeout(() => {
        startScanning();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanning();
      hasProcessedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle QR results
  useEffect(() => {
    if (qrResults.length > 0 && !hasProcessedRef.current) {
      const latest = qrResults[0];
      if (latest?.data) {
        hasProcessedRef.current = true;
        stopScanning();
        onScanned(latest.data);
      }
    }
  }, [qrResults, onScanned, stopScanning]);

  const handleClose = () => {
    stopScanning();
    clearResults();
    hasProcessedRef.current = false;
    onClose();
  };

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {isSupported === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Camera is not supported in this browser. Please use a modern browser with camera access.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.type === 'permission'
                  ? 'Camera permission denied. Please allow camera access and try again.'
                  : error.type === 'not-found'
                  ? 'No camera found on this device.'
                  : `Camera error: ${error.message}`}
              </AlertDescription>
            </Alert>
          )}

          <div
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ minHeight: 280, aspectRatio: '4/3' }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}

            {isActive && isScanning && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-primary rounded-lg w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br" />
                </div>
              </div>
            )}

            {!isActive && !isLoading && !error && isSupported !== false && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <Camera className="h-10 w-10 mx-auto mb-2 opacity-60" />
                  <p className="text-sm opacity-80">Camera not active</p>
                </div>
              </div>
            )}
          </div>

          {isActive && isScanning && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              Scanning for QR code...
            </p>
          )}

          <div className="flex gap-2 justify-center">
            {!isActive && !isLoading && (
              <Button
                onClick={() => startScanning()}
                disabled={!canStartScanning}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                onClick={() => stopScanning()}
                disabled={isLoading}
                className="gap-2"
              >
                Stop Camera
              </Button>
            )}
            {isMobile && isActive && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => switchCamera()}
                disabled={isLoading}
              >
                <SwitchCamera className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Button variant="ghost" className="w-full" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
