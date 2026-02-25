import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useActor } from '../../hooks/useActor';
import { useQuery } from '@tanstack/react-query';
import { Shield, MapPin, Package, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalBlob } from '../../backend';

interface VerificationRecord {
  orderId: string;
  storeName: string;
  distributor: any;
  truckNumber: string;
  driverName: string;
  timestamp: bigint;
  loadedTruckImage?: Uint8Array;
  unloadedTruckImage?: Uint8Array;
  emptyTruckImage?: ExternalBlob;
  storeRecord?: {
    storeName: string;
    ownerName: string;
    mobileNumber: string;
    address: string;
    landmark: string;
    latitude: number;
    longitude: number;
    timestamp: bigint;
  };
  orderContents: {
    rate: number;
    notes: string;
    quantity: bigint;
  };
}

function ImageModal({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <img src={src} alt={title} className="w-full rounded-lg object-contain max-h-[70vh]" />
      </DialogContent>
    </Dialog>
  );
}

function uint8ArrayToObjectUrl(data: Uint8Array): string {
  // Cast through unknown to satisfy strict ArrayBuffer typing
  const buffer = data.buffer as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  return URL.createObjectURL(blob);
}

function TruckImageCell({ imageData, label }: { imageData?: Uint8Array; label: string }) {
  const [showModal, setShowModal] = useState(false);
  const [url] = useState<string | null>(() => {
    if (!imageData || imageData.length === 0) return null;
    return uint8ArrayToObjectUrl(imageData);
  });

  if (!url) {
    return <span className="text-muted-foreground text-xs">No image</span>;
  }

  return (
    <>
      <img
        src={url}
        alt={label}
        className="w-12 h-12 object-cover rounded cursor-pointer border border-border hover:opacity-80 transition-opacity"
        onClick={() => setShowModal(true)}
      />
      {showModal && <ImageModal src={url} title={label} onClose={() => setShowModal(false)} />}
    </>
  );
}

function ExternalBlobImageCell({ blob, label }: { blob?: ExternalBlob; label: string }) {
  const [showModal, setShowModal] = useState(false);
  if (!blob) {
    return <span className="text-muted-foreground text-xs">No image</span>;
  }
  const url = blob.getDirectURL();
  return (
    <>
      <img
        src={url}
        alt={label}
        className="w-12 h-12 object-cover rounded cursor-pointer border border-border hover:opacity-80 transition-opacity"
        onClick={() => setShowModal(true)}
      />
      {showModal && <ImageModal src={url} title={label} onClose={() => setShowModal(false)} />}
    </>
  );
}

declare global {
  interface Window {
    L: any;
  }
}

let leafletLoaded = false;
let leafletLoadPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (leafletLoaded) return Promise.resolve();
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="leaflet"]')) {
      leafletLoaded = true;
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => { leafletLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}

function DeliveryLocationMap({ record, onClose }: { record: VerificationRecord; onClose: () => void }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!record.storeRecord) return;
    loadLeaflet().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L;
      const { latitude, longitude } = record.storeRecord!;
      const map = L.map(mapRef.current, { center: [latitude, longitude], zoom: 15 });
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
      ).addTo(map);
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { attribution: '', maxZoom: 19, opacity: 0.7 }
      ).addTo(map);
      L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(`<strong>${record.storeRecord!.storeName}</strong><br/>${record.storeRecord!.address}`)
        .openPopup();
      mapInstanceRef.current = map;
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [record]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Delivery Location — {record.storeRecord?.storeName || record.orderId}
          </DialogTitle>
        </DialogHeader>
        {record.storeRecord ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p><strong>Address:</strong> {record.storeRecord.address}</p>
              {record.storeRecord.landmark && <p><strong>Landmark:</strong> {record.storeRecord.landmark}</p>}
            </div>
            <div ref={mapRef} style={{ height: '350px' }} className="w-full rounded-lg border border-border" />
          </div>
        ) : (
          <p className="text-muted-foreground">No location data available for this delivery.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function DeliveryVerificationPage() {
  const { user } = useAuth();
  const { actor, isFetching: actorFetching } = useActor();
  const [selectedMapRecord, setSelectedMapRecord] = useState<VerificationRecord | null>(null);

  const sessionEmail = user?.email || '';

  const { data: records, isLoading } = useQuery<VerificationRecord[]>({
    queryKey: ['deliveryVerification', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getDeliveryVerificationRecords(sessionEmail);
      return result as VerificationRecord[];
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delivery Verification</h1>
          <p className="text-muted-foreground text-sm">Complete delivery records with images and location data</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Verified Deliveries ({records?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading verification records...</div>
          ) : !records || records.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No delivery verification records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Order Contents</TableHead>
                    <TableHead>Delivery Destination</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Truck Number</TableHead>
                    <TableHead>Loaded Image</TableHead>
                    <TableHead>Unloaded Image</TableHead>
                    <TableHead>Empty Truck</TableHead>
                    <TableHead>Map</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.orderId}>
                      <TableCell className="font-mono text-xs font-medium">{record.orderId}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1 min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3 text-muted-foreground" />
                            <span><strong>Qty:</strong> {record.orderContents.quantity.toString()}</span>
                          </div>
                          <div><strong>Rate:</strong> ₹{record.orderContents.rate.toFixed(2)}</div>
                          {record.orderContents.notes && (
                            <div className="text-muted-foreground truncate max-w-[150px]" title={record.orderContents.notes}>
                              {record.orderContents.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.storeRecord ? (
                          <div className="text-xs space-y-1 min-w-[140px]">
                            <p className="font-medium">{record.storeRecord.storeName}</p>
                            <p className="text-muted-foreground truncate max-w-[160px]" title={record.storeRecord.address}>
                              {record.storeRecord.address}
                            </p>
                            {record.storeRecord.landmark && (
                              <p className="text-muted-foreground text-xs">{record.storeRecord.landmark}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{record.driverName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{record.truckNumber}</Badge>
                      </TableCell>
                      <TableCell>
                        <TruckImageCell imageData={record.loadedTruckImage} label="Loaded Truck" />
                      </TableCell>
                      <TableCell>
                        <TruckImageCell imageData={record.unloadedTruckImage} label="Unloaded Truck" />
                      </TableCell>
                      <TableCell>
                        <ExternalBlobImageCell blob={record.emptyTruckImage} label="Empty Truck" />
                      </TableCell>
                      <TableCell>
                        {record.storeRecord && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMapRecord(record)}
                            className="h-8 w-8 p-0"
                          >
                            <MapPin className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(Number(record.timestamp) / 1_000_000).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMapRecord && (
        <DeliveryLocationMap
          record={selectedMapRecord}
          onClose={() => setSelectedMapRecord(null)}
        />
      )}
    </div>
  );
}
