import React, { useState } from 'react';
import { useAllStores, useAddStore, useUpdateStore, useDeleteStore } from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { Store } from '../../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Loader2, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

const emptyStore = (): Omit<Store, 'timestamp'> => ({
  storeName: '',
  ownerName: '',
  mobileNumber: '',
  address: '',
  landmark: '',
  latitude: 0,
  longitude: 0,
});

export default function StoreManagementPage() {
  const { actor, isFetching: actorFetching } = useActor();
  const { data: stores = [], isLoading } = useAllStores();
  const addStoreMutation = useAddStore();
  const updateStoreMutation = useUpdateStore();
  const deleteStoreMutation = useDeleteStore();

  const actorReady = !!actor && !actorFetching;

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyStore());
  const [submitting, setSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const filteredStores = stores.filter(
    (s) =>
      s.storeName.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyStore());
    setLocationError(null);
    setDialogOpen(true);
  };

  const openEdit = (store: Store, idx: number) => {
    setEditingId(BigInt(idx + 1));
    setForm({
      storeName: store.storeName,
      ownerName: store.ownerName,
      mobileNumber: store.mobileNumber,
      address: store.address,
      landmark: store.landmark,
      latitude: store.latitude,
      longitude: store.longitude,
    });
    setLocationError(null);
    setDialogOpen(true);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((f) => ({ ...f, latitude, longitude }));
        setIsLocating(false);
        toast.success(`Location detected: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable. Please try again.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationError(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!form.storeName.trim() || !form.ownerName.trim()) {
      toast.error('Store name and owner name are required');
      return;
    }
    setSubmitting(true);
    try {
      const storeData: Store = {
        ...form,
        timestamp: BigInt(Date.now()),
      };
      if (editingId !== null) {
        await updateStoreMutation.mutateAsync({ id: editingId, store: storeData });
        toast.success('Store updated successfully');
      } else {
        await addStoreMutation.mutateAsync(storeData);
        toast.success('Store added successfully');
      }
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('Unauthorized') || msg.includes('permission')) {
        toast.error('Permission denied. Please log out and log back in.');
      } else {
        toast.error(`Failed to save store: ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    try {
      await deleteStoreMutation.mutateAsync(deleteConfirmId);
      toast.success('Store deleted successfully');
    } catch (err: any) {
      toast.error(`Failed to delete store: ${err?.message ?? err}`);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all registered stores</p>
        </div>
        <Button onClick={openAdd} disabled={!actorReady} className="gap-2">
          {actorFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Store
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Stores ({filteredStores.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || actorFetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No stores found
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
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{store.storeName}</TableCell>
                      <TableCell>{store.ownerName}</TableCell>
                      <TableCell>{store.mobileNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{store.address}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {store.latitude !== 0 || store.longitude !== 0
                          ? `${store.latitude.toFixed(4)}, ${store.longitude.toFixed(4)}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(store, idx)}
                            disabled={!actorReady}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(BigInt(idx + 1))}
                            disabled={!actorReady}
                          >
                            <Trash2 className="w-4 h-4" />
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
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setLocationError(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Edit Store' : 'Add New Store'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {[
              { label: 'Store Name *', key: 'storeName', type: 'text' },
              { label: 'Owner Name *', key: 'ownerName', type: 'text' },
              { label: 'Mobile Number', key: 'mobileNumber', type: 'tel' },
              { label: 'Address', key: 'address', type: 'text' },
              { label: 'Landmark', key: 'landmark', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key} className="grid gap-1.5">
                <Label>{label}</Label>
                <Input
                  type={type}
                  value={String((form as any)[key])}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}

            {/* Location section */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Location Coordinates</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating || submitting}
                  className="gap-1.5 text-xs h-7"
                >
                  {isLocating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Navigation className="w-3 h-3" />
                  )}
                  {isLocating ? 'Detecting…' : 'Use Current Location'}
                </Button>
              </div>

              {locationError && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitude === 0 ? '' : String(form.latitude)}
                    placeholder="e.g. 12.9716"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitude === 0 ? '' : String(form.longitude)}
                    placeholder="e.g. 77.5946"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              {(form.latitude !== 0 || form.longitude !== 0) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span>
                    {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || isLocating}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingId !== null ? 'Update' : 'Add'} Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this store? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
