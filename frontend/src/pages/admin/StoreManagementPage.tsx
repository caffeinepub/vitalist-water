import React, { useState, Suspense, lazy } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAllStores, useAddStore, useUpdateStore, useDeleteStore } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { AlertCircle, Loader2, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import type { Store } from '../../backend';

const SatelliteMapView = lazy(() => import('../../components/map/SatelliteMapView'));

interface StoreForm {
  storeName: string;
  ownerName: string;
  mobileNumber: string;
  address: string;
  landmark: string;
  latitude: string;
  longitude: string;
}

const emptyForm: StoreForm = {
  storeName: '',
  ownerName: '',
  mobileNumber: '',
  address: '',
  landmark: '',
  latitude: '',
  longitude: '',
};

export default function StoreManagementPage() {
  const { user } = useAuth();
  const email = user?.email ?? '';

  const { data: stores = [], isLoading, error } = useAllStores(email);
  const addStoreMutation = useAddStore();
  const updateStoreMutation = useUpdateStore();
  const deleteStoreMutation = useDeleteStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<{ store: Store; index: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openAdd = () => {
    setEditingStore(null);
    setForm(emptyForm);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (store: Store, index: number) => {
    setEditingStore({ store, index });
    setForm({
      storeName: store.storeName,
      ownerName: store.ownerName,
      mobileNumber: store.mobileNumber,
      address: store.address,
      landmark: store.landmark,
      latitude: String(store.latitude),
      longitude: String(store.longitude),
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  };

  const handleSubmit = async () => {
    if (!form.storeName.trim() || !form.ownerName.trim()) {
      setFormError('Store name and owner name are required.');
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setFormError('Please select a valid location on the map or enter coordinates.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const storeData: Store = {
        storeName: form.storeName.trim(),
        ownerName: form.ownerName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        address: form.address.trim(),
        landmark: form.landmark.trim(),
        latitude: lat,
        longitude: lng,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      };
      if (editingStore) {
        await updateStoreMutation.mutateAsync({
          id: BigInt(editingStore.index + 1),
          store: storeData,
          sessionEmail: email,
        });
      } else {
        await addStoreMutation.mutateAsync({ store: storeData, sessionEmail: email });
      }
      setDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save store.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteStoreMutation.mutateAsync({
        id: BigInt(deleteTarget + 1),
        sessionEmail: email,
      });
    } catch (err) {
      console.error('Delete store error:', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const mapCenter: [number, number] =
    form.latitude && form.longitude
      ? [parseFloat(form.latitude) || 20.5937, parseFloat(form.longitude) || 78.9629]
      : [20.5937, 78.9629];

  const mapMarkers =
    form.latitude && form.longitude && !isNaN(parseFloat(form.latitude))
      ? [{ lat: parseFloat(form.latitude), lng: parseFloat(form.longitude), label: 'Store Location' }]
      : [];

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>Failed to load stores. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Store Management</h1>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Store
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Stores{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({stores.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No stores yet. Add your first store.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{store.storeName}</TableCell>
                      <TableCell>{store.ownerName}</TableCell>
                      <TableCell>{store.mobileNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {store.address}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(store, idx)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
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
      <Dialog open={dialogOpen} onOpenChange={(o) => !submitting && setDialogOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStore ? 'Edit Store' : 'Add Store'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Store Name *</Label>
                <Input
                  value={form.storeName}
                  onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                  placeholder="Store name"
                />
              </div>
              <div className="space-y-1">
                <Label>Owner Name *</Label>
                <Input
                  value={form.ownerName}
                  onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                  placeholder="Owner name"
                />
              </div>
              <div className="space-y-1">
                <Label>Mobile Number</Label>
                <Input
                  value={form.mobileNumber}
                  onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="space-y-1">
                <Label>Landmark</Label>
                <Input
                  value={form.landmark}
                  onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))}
                  placeholder="Nearby landmark"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>

            {/* Map picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location (click map to set)
              </Label>
              <Suspense
                fallback={
                  <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <SatelliteMapView
                  center={mapCenter}
                  zoom={mapMarkers.length > 0 ? 14 : 5}
                  markers={mapMarkers}
                  onClick={handleMapClick}
                  height="220px"
                />
              </Suspense>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    value={form.latitude}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    placeholder="e.g. 12.9716"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    value={form.longitude}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    placeholder="e.g. 77.5946"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setForm((f) => ({
                      ...f,
                      latitude: pos.coords.latitude.toFixed(6),
                      longitude: pos.coords.longitude.toFixed(6),
                    }));
                  });
                }}
              >
                <MapPin className="h-3 w-3 mr-1" />
                Use Current Location
              </Button>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : editingStore ? (
                'Update Store'
              ) : (
                'Add Store'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this store? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
