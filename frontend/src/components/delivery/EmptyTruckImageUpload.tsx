import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Camera, X, CheckCircle } from 'lucide-react';
import { ExternalBlob } from '../../backend';
import { Progress } from '@/components/ui/progress';

interface EmptyTruckImageUploadProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onUpload: (orderId: string, blob: ExternalBlob) => Promise<void>;
}

export default function EmptyTruckImageUpload({ orderId, open, onClose, onUpload }: EmptyTruckImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setUploaded(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
        setUploadProgress(pct);
      });
      await onUpload(orderId, blob);
      setUploaded(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setUploaded(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Upload Empty Truck Image
          </DialogTitle>
          <DialogDescription>
            Please upload a photo of the empty truck for Order <strong>{orderId}</strong> to complete delivery verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!previewUrl ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Click to select an image</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP supported</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Empty truck preview"
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
              {!uploading && !uploaded && (
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:opacity-90"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {uploading && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {uploaded && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Image uploaded successfully!</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {uploaded ? 'Close' : 'Skip'}
            </Button>
            {!uploaded && (
              <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
