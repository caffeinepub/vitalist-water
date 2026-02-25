import React, { useEffect, useRef } from 'react';
import { Camera, SwitchCamera, AlertCircle, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
// @ts-ignore - prefabricated component
import { useQRScanner } from '../../qr-code/useQRScanner';
import { decodeQRData } from '../../utils/orderUtils';

interface BarcodeScanStepProps {
  onBarcodeScanned: (value: string) => void;
  expectedOrderId?: string;
}

export default function BarcodeScanStep({ onBarcodeScanned, expectedOrderId }: BarcodeScanStepProps) {
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

  useEffect(() => {
    hasProcessedRef.current = false;
    clearResults();
    const timer = setTimeout(() => {
      startScanning();
    }, 300);
    return () => {
      clearTimeout(timer);
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (qrResults.length > 0 && !hasProcessedRef.current) {
      const latest = qrResults[0];
      if (latest?.data) {
        hasProcessedRef.current = true;
        stopScanning();
        const decoded = decodeQRData(latest.data);
        const valueToPass = decoded ?? latest.data;
        onBarcodeScanned(valueToPass);
      }
    }
  }, [qrResults, onBarcodeScanned, stopScanning]);

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <QrCode className="h-8 w-8 text-primary mx-auto mb-2" />
        <h3 className="font-semibold text-foreground">Scan Order Barcode / QR Code</h3>
        {expectedOrderId && (
          <p className="text-sm text-muted-foreground mt-1">
            Expected Order: <span className="font-mono font-medium">{expectedOrderId}</span>
          </p>
        )}
      </div>

      {isSupported === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Camera is not supported in this browser.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.type === 'permission'
              ? 'Camera permission denied. Please allow camera access.'
              : error.type === 'not-found'
              ? 'No camera found on this device.'
              : `Camera error: ${error.message}`}
          </AlertDescription>
        </Alert>
      )}

      <div
        className="relative bg-black rounded-lg overflow-hidden mx-auto"
        style={{ maxWidth: 400, minHeight: 280, aspectRatio: '4/3' }}
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
          <Button onClick={() => startScanning()} disabled={!canStartScanning} className="gap-2">
            <Camera className="h-4 w-4" />
            Start Camera
          </Button>
        )}
        {isActive && (
          <Button variant="outline" onClick={() => stopScanning()} disabled={isLoading}>
            Stop Camera
          </Button>
        )}
        {isMobile && isActive && (
          <Button variant="outline" size="icon" onClick={() => switchCamera()} disabled={isLoading}>
            <SwitchCamera className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
