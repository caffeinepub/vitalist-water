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
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ExternalBlob } from '../../backend';
import { useAddEmptyTruckImage } from '../../hooks/useQueries';
import { useAuth } from '../../contexts/AuthContext';

interface EmptyTruckImageUploadProps {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onUpload?: (orderId: string, blob: ExternalBlob) => Promise<void>;
}

export default function EmptyTruckImageUpload({
  open,
  orderId,
  onClose,
  onUpload,
}: EmptyTruckImageUploadProps) {
  const { sessionEmail } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addEmptyTruckImageMutation = useAddEmptyTruckImage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
        setUploadProgress(pct);
      });

      if (onUpload) {
        await onUpload(orderId, blob);
      } else {
        await addEmptyTruckImageMutation.mutateAsync({
          orderId,
          file: blob,
          sessionEmail,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedFile(null);
        setUploadProgress(0);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setError(null);
      setSuccess(false);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Empty Truck Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please upload a photo of the empty truck after delivery for order{' '}
            <span className="font-mono font-medium">{orderId}</span>.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Image uploaded successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium block">
              <Upload className="h-4 w-4 inline mr-1" />
              Select Image *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
            {selectedFile && (
              <p className="text-xs text-green-600">✓ {selectedFile.name}</p>
            )}
          </div>

          {isUploading && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {success ? 'Close' : 'Skip'}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || success}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
