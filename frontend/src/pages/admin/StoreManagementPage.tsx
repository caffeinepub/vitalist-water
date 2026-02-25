import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MapPin, Phone, User, Loader2, Store as StoreIcon, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAllStores, useAddStore, useUpdateStore, useDeleteStore } from '../../hooks/useQueries';
import type { Store } from '../../backend';

const emptyForm = {
  storeName: '',
  ownerName: '',
  mobileNumber: '',
  address: '',
  landmark: '',
  latitude: '',
  longitude: '',
};

type StoreForm = typeof emptyForm;

function storeFormToStore(form: StoreForm): Store {
  return {
    storeName: form.storeName.trim(),
    ownerName: form.ownerName.trim(),
    mobileNumber: form.mobileNumber.trim(),
    address: form.address.trim(),
    landmark: form.landmark.trim(),
    latitude: parseFloat(form.latitude) || 0,
    longitude: parseFloat(form.longitude) || 0,
    timestamp: BigInt(Date.now()),
  };
}

function storeToForm(store: Store): StoreForm {
  return {
    storeName: store.storeName,
    ownerName: store.ownerName,
    mobileNumber: store.mobileNumber,
    address: store.address,
    landmark: store.landmark,
    latitude: store.latitude.toString(),
    longitude: store.longitude.toString(),
  };
}

function buildMapSrc(lat: string, lon: string): string {
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum)) return '';
  const delta = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lonNum - delta},${latNum - delta},${lonNum + delta},${latNum + delta}&layer=mapnik&marker=${latNum},${lonNum}`;
}

interface MapPreviewProps {
  latitude: string;
  longitude: string;
}

function MapPreview({ latitude, longitude }: MapPreviewProps) {
  const src = buildMapSrc(latitude, longitude);
  const hasCoords = !!src;

  if (!hasCoords) {
    return (
      <div className="w-full rounded-lg border border-border bg-muted flex items-center justify-center" style={{ minHeight: 200 }}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
          <MapPin className="w-8 h-8 opacity-30" />
          <p>Enter coordinates or use current location to see map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border" style={{ minHeight: 200, aspectRatio: '16/9' }}>
      <iframe
        key={src}
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, display: 'block', minHeight: 200 }}
        title="Store Location Map"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function StoreManagementPage() {
  const { data: stores = [], isLoading } = useGetAllStores();
  const addStore = useAddStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const isMutating = addStore.isPending || updateStore.isPending;

  const openAdd = () => {
    setEditingIndex(null);
    setForm(emptyForm);
    setGeoError(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setForm(storeToForm(stores[index]));
    setGeoError(null);
    setDialogOpen(true);
  };

  const openDelete = (id: bigint) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        setForm((prev) => ({ ...prev, latitude: lat, longitude: lon }));
        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please allow location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out. Please try again.');
            break;
          default:
            setGeoError('An unknown error occurred while fetching location.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName.trim() || !form.ownerName.trim() || !form.mobileNumber.trim() || !form.address.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const storeData = storeFormToStore(form);

    try {
      if (editingIndex !== null) {
        const storeId = BigInt(editingIndex + 1);
        await updateStore.mutateAsync({ id: storeId, store: storeData });
        toast.success('Store updated successfully');
      } else {
        await addStore.mutateAsync(storeData);
        toast.success('Store added successfully');
      }
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Only admins') || msg.includes('Unauthorized')) {
        toast.error('Permission denied: Only admins can manage stores. Please ensure you are logged in as admin.');
      } else {
        toast.error(`Failed: ${msg}`);
      }
    }
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    try {
      await deleteStore.mutateAsync(deletingId);
      toast.success('Store deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Only admins') || msg.includes('Unauthorized')) {
        toast.error('Permission denied: Only admins can delete stores.');
      } else {
        toast.error(`Failed to delete store: ${msg}`);
      }
    }
  };

  const filteredStores = stores.filter(
    (s) =>
      s.storeName.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all registered stores</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Store
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">
              All Stores ({filteredStores.length})
            </CardTitle>
            <Input
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <StoreIcon className="w-10 h-10 opacity-30" />
              <p className="text-sm">No stores found</p>
              <Button variant="outline" size="sm" onClick={openAdd} className="mt-2">
                Add your first store
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Landmark</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4 text-primary opacity-70" />
                          {store.storeName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {store.ownerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {store.mobileNumber}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{store.address}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{store.landmark || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(index)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(BigInt(index + 1))}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setGeoError(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit Store' : 'Add New Store'}</DialogTitle>
            <DialogDescription>
              {editingIndex !== null ? 'Update store information' : 'Fill in the details to add a new store'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name *</Label>
                <Input
                  id="storeName"
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  placeholder="Store name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name *</Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="Owner name"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number *</Label>
              <Input
                id="mobileNumber"
                value={form.mobileNumber}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                placeholder="+1 234 567 8900"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landmark">Landmark</Label>
              <Input
                id="landmark"
                value={form.landmark}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                placeholder="Nearby landmark"
              />
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Location (Coordinates)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLoading}
                  className="gap-2 text-xs"
                >
                  {geoLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Navigation className="w-3 h-3" />
                  )}
                  {geoLoading ? 'Getting location...' : 'Use Current Location'}
                </Button>
              </div>

              {geoError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{geoError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="e.g. 28.6139"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="e.g. 77.2090"
                  />
                </div>
              </div>

              {/* Map Preview */}
              <MapPreview latitude={form.latitude} longitude={form.longitude} />

              {form.latitude && form.longitude && (
                <p className="text-xs text-muted-foreground text-center">
                  📍 {parseFloat(form.latitude).toFixed(6)}, {parseFloat(form.longitude).toFixed(6)}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingIndex !== null ? 'Update Store' : 'Add Store'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this store? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStore.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteStore.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStore.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
