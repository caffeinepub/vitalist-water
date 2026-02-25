import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useActor } from '../../hooks/useActor';
import { useQuery } from '@tanstack/react-query';
import { MapPin, RefreshCw, Truck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrackingEntry {
  orderId: string;
  status: string;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: bigint;
  };
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

export default function LiveTrackingPage() {
  const { user } = useAuth();
  const { actor, isFetching: actorFetching } = useActor();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const sessionEmail = user?.email || '';

  const { data: trackingData, isLoading, refetch } = useQuery<TrackingEntry[]>({
    queryKey: ['liveTracking', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getLiveTrackingData(sessionEmail);
      return result as TrackingEntry[];
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const activeDeliveries = (trackingData || []).filter(
    (d) => d.location && (d.status === 'Out for Delivery' || d.status === 'Dispatched')
  );

  useEffect(() => {
    loadLeaflet().then(() => {
      setMapReady(true);
    });
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 19, opacity: 0.7 }
    ).addTo(map);

    mapInstanceRef.current = map;
  }, [mapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !mapReady) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (activeDeliveries.length === 0) return;

    const truckIcon = L.divIcon({
      html: `<div style="background:#f97316;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    activeDeliveries.forEach((entry) => {
      if (!entry.location) return;
      const marker = L.marker([entry.location.latitude, entry.location.longitude], { icon: truckIcon })
        .addTo(map);
      marker.bindPopup(`
        <div style="min-width:160px">
          <strong>Order ID:</strong> ${entry.orderId}<br/>
          <strong>Status:</strong> ${entry.status}<br/>
          <strong>Last Update:</strong> ${new Date(Number(entry.location.timestamp) / 1_000_000).toLocaleString()}
        </div>
      `);
      markersRef.current.push(marker);
    });

    if (activeDeliveries.length > 1) {
      const bounds = L.latLngBounds(
        activeDeliveries
          .filter((d) => d.location)
          .map((d) => [d.location!.latitude, d.location!.longitude])
      );
      map.fitBounds(bounds, { padding: [60, 60] });
    } else if (activeDeliveries.length === 1 && activeDeliveries[0].location) {
      map.setView([activeDeliveries[0].location.latitude, activeDeliveries[0].location.longitude], 13);
    }
  }, [activeDeliveries, mapReady]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Live Tracking
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time GPS positions of active delivery agents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeDeliveries.length}</p>
                <p className="text-xs text-muted-foreground">Active Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(trackingData || []).length}</p>
                <p className="text-xs text-muted-foreground">Total Tracked Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <RefreshCw className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">30s</p>
                <p className="text-xs text-muted-foreground">Auto-refresh Interval</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivery Agent Locations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <div ref={mapContainerRef} style={{ height: '500px' }} className="w-full rounded-b-lg" />
            {activeDeliveries.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-background/90 backdrop-blur-sm border border-border rounded-xl p-6 text-center shadow-lg max-w-xs">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-semibold text-foreground">No Active Deliveries</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Delivery agents will appear here when they are out for delivery.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Deliveries List */}
      {activeDeliveries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Delivery Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeDeliveries.map((entry) => (
                <div key={entry.orderId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                      <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entry.orderId}</p>
                      {entry.location && (
                        <p className="text-xs text-muted-foreground">
                          {entry.location.latitude.toFixed(4)}, {entry.location.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {entry.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
