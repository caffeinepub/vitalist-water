import React, { useEffect, useCallback } from 'react';
import { useQRScanner } from '../../qr-code/useQRScanner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, CameraOff, SwitchCamera, X } from 'lucide-react';

interface QRScanModalProps {
  open: boolean;
  onClose: () => void;
  onScanned: (value: string) => void;
  title?: string;
  description?: string;
}

export default function QRScanModal({
  open,
  onClose,
  onScanned,
  title = 'Scan QR Code',
  description = 'Point the camera at a QR code to scan it.',
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
    jsQRLoaded,
  } = useQRScanner({
    facingMode: 'environment',
    scanInterval: 150,
    maxResults: 3,
  });

  // Start scanning when modal opens
  useEffect(() => {
    if (open && canStartScanning) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [open, canStartScanning, startScanning, stopScanning]);

  // Handle scan results
  useEffect(() => {
    if (qrResults.length > 0) {
      const latest = qrResults[0];
      stopScanning();
      onScanned(latest.data);
      clearResults();
      onClose();
    }
  }, [qrResults, stopScanning, onScanned, clearResults, onClose]);

  const handleClose = useCallback(() => {
    stopScanning();
    clearResults();
    onClose();
  }, [stopScanning, clearResults, onClose]);

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Camera preview */}
          <div
            className="relative w-full bg-black rounded-lg overflow-hidden"
            style={{ aspectRatio: '4/3' }}
          >
            {isSupported === false ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
                <CameraOff className="h-8 w-8 opacity-60" />
                <p className="text-sm opacity-80">Camera not supported</p>
              </div>
            ) : (isLoading || !jsQRLoaded) && !isActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
                <Loader2 className="h-8 w-8 animate-spin opacity-80" />
                <p className="text-sm opacity-80">
                  {!jsQRLoaded ? 'Loading scanner…' : 'Starting camera…'}
                </p>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 px-4">
                <CameraOff className="h-8 w-8 opacity-60" />
                <p className="text-sm opacity-80 text-center">{error.message}</p>
              </div>
            ) : null}

            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              style={{ display: isActive ? 'block' : 'none' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/70 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br" />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!isActive ? (
              <Button
                onClick={() => startScanning()}
                disabled={!canStartScanning || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => stopScanning()}
                disabled={isLoading}
                className="flex-1"
              >
                Stop
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

            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isScanning && (
            <p className="text-xs text-center text-muted-foreground">
              Scanning… point at a QR code
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
