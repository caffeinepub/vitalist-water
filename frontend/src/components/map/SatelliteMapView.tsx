import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface Marker {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

interface SatelliteMapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: Marker[];
  onClick?: (lat: number, lng: number) => void;
  height?: string;
  showLabels?: boolean;
  className?: string;
}

declare global {
  interface Window {
    L: any;
    _leafletLoaded?: boolean;
    _leafletLoading?: boolean;
    _leafletCallbacks?: Array<() => void>;
  }
}

function loadLeaflet(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window._leafletLoaded && window.L) {
      resolve();
      return;
    }
    if (window._leafletLoading) {
      window._leafletCallbacks = window._leafletCallbacks || [];
      window._leafletCallbacks.push(() => resolve());
      return;
    }
    window._leafletLoading = true;
    window._leafletCallbacks = [];

    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      window._leafletLoaded = true;
      window._leafletLoading = false;
      (window._leafletCallbacks || []).forEach((cb) => cb());
      window._leafletCallbacks = [];
      resolve();
    };
    script.onerror = () => {
      window._leafletLoading = false;
      reject(new Error('Failed to load Leaflet map library'));
    };
    document.head.appendChild(script);
  });
}

export default function SatelliteMapView({
  center = [20.5937, 78.9629],
  zoom = 5,
  markers = [],
  onClick,
  height = '400px',
  showLabels = true,
  className = '',
}: SatelliteMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      try {
        await loadLeaflet();
        if (cancelled || !mapRef.current) return;

        const L = window.L;

        // Destroy existing map instance
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {
            // ignore
          }
          mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, {
          center,
          zoom,
          zoomControl: true,
        });

        mapInstanceRef.current = map;

        // Esri World Imagery satellite tiles
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19,
          },
        ).addTo(map);

        if (showLabels) {
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 19, opacity: 0.8 },
          ).addTo(map);
        }

        // Add markers
        markers.forEach((m) => {
          const icon = L.divIcon({
            html: `<div style="background:${m.color || '#ef4444'};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
            className: '',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
          if (m.label) marker.bindPopup(m.label);
        });

        // Auto-fit bounds if multiple markers
        if (markers.length > 1) {
          try {
            const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
            map.fitBounds(bounds, { padding: [40, 40] });
          } catch {
            // ignore
          }
        }

        if (onClick) {
          map.on('click', (e: any) => {
            onClick(e.latlng.lat, e.latlng.lng);
          });
        }

        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load map');
          setLoading(false);
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
    // The map is only initialized once on mount; marker updates handled by the second effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!mapInstanceRef.current || loading) return;
    const L = window.L;
    if (!L) return;
    try {
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });
      markers.forEach((m) => {
        const icon = L.divIcon({
          html: `<div style="background:${m.color || '#ef4444'};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(mapInstanceRef.current);
        if (m.label) marker.bindPopup(m.label);
      });
    } catch {
      // ignore marker update errors
    }
  }, [markers, loading]);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted rounded-lg border border-border ${className}`}
        style={{ height }}
      >
        <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-border ${className}`}
      style={{ height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map…</p>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
