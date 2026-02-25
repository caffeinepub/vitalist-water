import React, { useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { fileToUint8Array } from '@/utils/imageUtils';

interface ImageUploadStepProps {
  onComplete: (loadedImage: Uint8Array, unloadedImage: Uint8Array) => void;
}

export default function ImageUploadStep({ onComplete }: ImageUploadStepProps) {
  const [loadedFile, setLoadedFile] = useState<File | null>(null);
  const [unloadedFile, setUnloadedFile] = useState<File | null>(null);
  const [loadedPreview, setLoadedPreview] = useState<string | null>(null);
  const [unloadedPreview, setUnloadedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'loaded' | 'unloaded'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    if (type === 'loaded') {
      setLoadedFile(file);
      setLoadedPreview(previewUrl);
    } else {
      setUnloadedFile(file);
      setUnloadedPreview(previewUrl);
    }
  };

  const clearFile = (type: 'loaded' | 'unloaded') => {
    if (type === 'loaded') {
      setLoadedFile(null);
      setLoadedPreview(null);
    } else {
      setUnloadedFile(null);
      setUnloadedPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!loadedFile || !unloadedFile) return;
    setIsProcessing(true);
    try {
      const [loadedBytes, unloadedBytes] = await Promise.all([
        fileToUint8Array(loadedFile),
        fileToUint8Array(unloadedFile),
      ]);
      onComplete(loadedBytes, unloadedBytes);
    } catch {
      // handle error silently
    } finally {
      setIsProcessing(false);
    }
  };

  const canSubmit = !!loadedFile && !!unloadedFile && !isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground text-center">
        Upload photos of the truck before and after unloading.
      </p>

      {/* Loaded Truck Image */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Loaded Truck Image *</Label>
        {loadedPreview ? (
          <div className="relative rounded-lg overflow-hidden border">
            <img src={loadedPreview} alt="Loaded truck" className="w-full h-40 object-cover" />
            <button
              onClick={() => clearFile('loaded')}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload loaded truck photo</span>
            <span className="text-xs text-muted-foreground mt-1">JPEG, PNG accepted</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'loaded')}
            />
          </label>
        )}
      </div>

      {/* Unloaded Truck Image */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Unloaded Truck Image *</Label>
        {unloadedPreview ? (
          <div className="relative rounded-lg overflow-hidden border">
            <img src={unloadedPreview} alt="Unloaded truck" className="w-full h-40 object-cover" />
            <button
              onClick={() => clearFile('unloaded')}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload unloaded truck photo</span>
            <span className="text-xs text-muted-foreground mt-1">JPEG, PNG accepted</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'unloaded')}
            />
          </label>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        {isProcessing ? 'Processing...' : 'Continue with Images'}
      </Button>
    </div>
  );
}
