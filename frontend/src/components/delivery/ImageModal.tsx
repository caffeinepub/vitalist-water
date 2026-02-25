import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageModalProps {
  imageUrl: string | null;
  title?: string;
  open: boolean;
  onClose: () => void;
}

export default function ImageModal({ imageUrl, title = 'Image', open, onClose }: ImageModalProps) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoomed(!zoomed)}>
              {zoomed ? <ZoomOut className="w-4 h-4 mr-1" /> : <ZoomIn className="w-4 h-4 mr-1" />}
              {zoomed ? 'Zoom Out' : 'Zoom In'}
            </Button>
          </div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className={`rounded-lg transition-all ${
                zoomed ? 'w-full' : 'max-w-full max-h-[60vh] object-contain'
              }`}
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">No image available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
