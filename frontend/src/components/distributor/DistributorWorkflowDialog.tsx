import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BarcodeScanStep from './BarcodeScanStep';
import ImageUploadStep from './ImageUploadStep';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSubmitDistributorConfirmation } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';

interface DistributorWorkflowDialogProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'barcode' | 'images' | 'confirm' | 'done';

export default function DistributorWorkflowDialog({
  orderId,
  open,
  onClose,
  onSuccess,
}: DistributorWorkflowDialogProps) {
  const { user } = useAuth();
  const sessionEmail = user?.email ?? '';

  const [step, setStep] = useState<Step>('barcode');
  const [barcodeData, setBarcodeData] = useState<string>('');
  const [loadedImage, setLoadedImage] = useState<Uint8Array | null>(null);
  const [unloadedImage, setUnloadedImage] = useState<Uint8Array | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const submitMutation = useSubmitDistributorConfirmation();

  const stepLabels: Record<Step, string> = {
    barcode: 'Step 1 of 3 — Scan Barcode',
    images: 'Step 2 of 3 — Upload Images',
    confirm: 'Step 3 of 3 — Confirm Submission',
    done: 'Delivery Confirmed!',
  };

  const handleBarcodeSuccess = (data: string) => {
    setBarcodeData(data);
    setStep('images');
  };

  const handleImagesComplete = (loaded: Uint8Array, unloaded: Uint8Array) => {
    setLoadedImage(loaded);
    setUnloadedImage(unloaded);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!loadedImage || !unloadedImage) return;
    setErrorMsg('');
    try {
      await submitMutation.mutateAsync({
        orderId,
        barcodeScan: barcodeData,
        loadedTruckImage: loadedImage,
        unloadedTruckImage: unloadedImage,
        sessionEmail,
      });
      setStep('done');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    }
  };

  const handleClose = () => {
    if (step !== 'done') {
      setStep('barcode');
      setBarcodeData('');
      setLoadedImage(null);
      setUnloadedImage(null);
      setErrorMsg('');
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Confirmation</DialogTitle>
          <DialogDescription>{stepLabels[step]}</DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {step !== 'done' && (
          <div className="flex gap-2 mb-2">
            {(['barcode', 'images', 'confirm'] as Step[]).map((s, idx) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  step === s
                    ? 'bg-primary'
                    : ['barcode', 'images', 'confirm'].indexOf(step) > idx
                    ? 'bg-primary/60'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        {step === 'barcode' && (
          <BarcodeScanStep onBarcodeScanned={handleBarcodeSuccess} />
        )}

        {step === 'images' && (
          <ImageUploadStep onComplete={handleImagesComplete} />
        )}

        {step === 'confirm' && (
          <div className="flex flex-col gap-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Order ID</span>
                <p className="font-mono font-semibold">{orderId}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Barcode Scanned</span>
                <p className="font-mono text-sm truncate">{barcodeData}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Images</span>
                <p className="text-sm text-green-600">✓ Loaded &amp; Unloaded images ready</p>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('images')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex-1"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Confirmation'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h3 className="text-xl font-bold text-green-600">Delivery Confirmed!</h3>
            <p className="text-muted-foreground text-center">
              Order {orderId} has been marked as delivered and is now permanently locked.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
