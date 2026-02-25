import React, { useEffect } from 'react';
import { useQRScanner } from '../../qr-code/useQRScanner';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, CameraOff, SwitchCamera, CheckCircle } from 'lucide-react';

interface BarcodeScanStepProps {
  onBarcodeScanned: (barcode: string) => void;
  onCancel?: () => void;
}

export default function BarcodeScanStep({ onBarcodeScanned, onCancel }: BarcodeScanStepProps) {
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
    maxResults: 5,
  });

  const [selectedBarcode, setSelectedBarcode] = React.useState<string | null>(null);

  // Auto-start scanning
  useEffect(() => {
    if (canStartScanning) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [canStartScanning, startScanning, stopScanning]);

  const handleUseBarcode = (barcode: string) => {
    setSelectedBarcode(barcode);
    stopScanning();
    onBarcodeScanned(barcode);
  };

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  if (isSupported === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
        <CameraOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Camera is not supported in this browser.</p>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="relative w-full bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: '4/3' }}
      >
        {(isLoading || !jsQRLoaded) && !isActive ? (
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

        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Results */}
      {qrResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Scanned Codes</p>
            <Button variant="ghost" size="sm" onClick={clearResults}>
              Clear
            </Button>
          </div>
          {qrResults.map((result) => (
            <div
              key={result.timestamp}
              className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </p>
                <p className="text-sm font-mono truncate">{result.data}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleUseBarcode(result.data)}
                className="ml-2 shrink-0"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Use
              </Button>
            </div>
          ))}
        </div>
      )}

      {selectedBarcode && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-mono truncate">{selectedBarcode}</p>
        </div>
      )}
    </div>
  );
}
