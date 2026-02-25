import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Upload, QrCode } from 'lucide-react';
import BarcodeScanStep from './BarcodeScanStep';
import { useSubmitDistributorConfirmation } from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';
import type { OrderRecord } from '../../backend';

interface DistributorWorkflowDialogProps {
  open: boolean;
  order: OrderRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'scan' | 'upload' | 'confirm' | 'done';

export default function DistributorWorkflowDialog({
  open,
  order,
  onClose,
  onSuccess,
}: DistributorWorkflowDialogProps) {
  const { sessionEmail } = useAuth();

  const [step, setStep] = useState<Step>('scan');
  const [scannedValue, setScannedValue] = useState<string>('');
  const [loadedTruckFile, setLoadedTruckFile] = useState<File | null>(null);
  const [unloadedTruckFile, setUnloadedTruckFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useSubmitDistributorConfirmation();

  const handleBarcodeScanned = (value: string) => {
    setError(null);

    // Verify the scanned value matches the order
    if (order && value !== order.orderId) {
      setError(`Scanned barcode "${value}" does not match order "${order?.orderId}". Please scan the correct QR code.`);
      return;
    }

    setScannedValue(value);
    setStep('upload');
  };

  const handleLoadedTruckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLoadedTruckFile(file);
  };

  const handleUnloadedTruckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUnloadedTruckFile(file);
  };

  const handleSubmit = async () => {
    if (!order || !loadedTruckFile || !unloadedTruckFile) {
      setError('Please upload both truck images before submitting.');
      return;
    }

    setError(null);

    try {
      const loadedBytes = new Uint8Array(await loadedTruckFile.arrayBuffer());
      const unloadedBytes = new Uint8Array(await unloadedTruckFile.arrayBuffer());

      await submitMutation.mutateAsync({
        orderId: order.orderId,
        barcodeScan: scannedValue,
        loadedTruckImage: loadedBytes,
        unloadedTruckImage: unloadedBytes,
        sessionEmail,
      });

      setStep('done');
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setError(message);
    }
  };

  const handleClose = () => {
    setStep('scan');
    setScannedValue('');
    setLoadedTruckFile(null);
    setUnloadedTruckFile(null);
    setError(null);
    onClose();
  };

  const getStepTitle = () => {
    switch (step) {
      case 'scan': return 'Step 1: Scan Order QR Code';
      case 'upload': return 'Step 2: Upload Truck Images';
      case 'confirm': return 'Step 3: Confirm Submission';
      case 'done': return 'Delivery Confirmed!';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step: Scan */}
          {step === 'scan' && order && (
            <BarcodeScanStep
              onBarcodeScanned={handleBarcodeScanned}
              expectedOrderId={order.orderId}
            />
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded p-3">
                <CheckCircle className="h-4 w-4" />
                <span>QR Code scanned: <span className="font-mono font-medium">{scannedValue}</span></span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    <Upload className="h-4 w-4 inline mr-1" />
                    Loaded Truck Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLoadedTruckChange}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {loadedTruckFile && (
                    <p className="text-xs text-green-600 mt-1">✓ {loadedTruckFile.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    <Upload className="h-4 w-4 inline mr-1" />
                    Unloaded Truck Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUnloadedTruckChange}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {unloadedTruckFile && (
                    <p className="text-xs text-green-600 mt-1">✓ {unloadedTruckFile.name}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Delivery Confirmed!</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Order {order?.orderId} has been marked as delivered.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'scan' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => setStep('scan')}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!loadedTruckFile || !unloadedTruckFile || submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Confirmation'}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
