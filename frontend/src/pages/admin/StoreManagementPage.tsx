import React, { useState } from 'react';
import { useGetAllStores, useAddStore, useUpdateStore, useDeleteStore } from '../../hooks/useQueries';
import { Store } from '../../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit2, Trash2, MapPin, Phone, User, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentPosition } from '../../utils/geoUtils';

const emptyStore: Omit<Store, 'timestamp'> = {
  storeName: '',
  ownerName: '',
  mobileNumber: '',
  address: '',
  landmark: '',
  latitude: 0,
  longitude: 0,
};

export default function StoreManagementPage() {
  const { data: stores = [], isLoading } = useGetAllStores();
  const addStore = useAddStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Store, 'timestamp'>>(emptyStore);
  const [gpsLoading, setGpsLoading] = useState(false);

  const filtered = stores.filter(
    (s) =>
      s.storeName.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyStore);
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    const s = stores[index];
    setForm({
      storeName: s.storeName,
      ownerName: s.ownerName,
      mobileNumber: s.mobileNumber,
      address: s.address,
      landmark: s.landmark,
      latitude: s.latitude,
      longitude: s.longitude,
    });
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleGPS = async () => {
    setGpsLoading(true);
    try {
      const pos = await getCurrentPosition();
      setForm((f) => ({ ...f, latitude: pos.latitude, longitude: pos.longitude }));
      toast.success('Location detected successfully');
    } catch (err: unknown) {
      toast.error('Could not get location: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storeData: Store = {
      ...form,
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
    };

    try {
      if (editingIndex !== null) {
        // Find the store ID - stores are 1-indexed by backend
        const storeId = BigInt(editingIndex + 1);
        await updateStore.mutateAsync({ id: storeId, store: storeData });
        toast.success('Store updated successfully');
      } else {
        await addStore.mutateAsync(storeData);
        toast.success('Store added successfully');
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteStore.mutateAsync(deleteId);
      toast.success('Store deleted');
      setDeleteId(null);
    } catch (err: unknown) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const isSaving = addStore.isPending || updateStore.isPending;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage delivery store locations with GPS mapping</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Store
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search stores by name, owner, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Store Name</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Owner</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Mobile</TableHead>
              <TableHead className="font-semibold hidden xl:table-cell">Address</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">GPS</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {search ? 'No stores match your search' : 'No stores added yet. Click "Add Store" to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((store, idx) => (
                <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-foreground">{store.storeName}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{store.ownerName}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {store.ownerName}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {store.mobileNumber}
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="text-sm text-muted-foreground max-w-xs truncate">{store.address}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {store.latitude !== 0 ? (
                      <div className="flex items-center gap-1 text-xs text-green-600 font-mono">
                        <MapPin className="h-3 w-3" />
                        {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(idx)} className="h-8 w-8">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(BigInt(idx + 1))}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit Store' : 'Add New Store'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Store Name *</Label>
                <Input
                  value={form.storeName}
                  onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                  placeholder="e.g. City Center Store"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Owner Name *</Label>
                <Input
                  value={form.ownerName}
                  onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                  placeholder="Owner's full name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number *</Label>
                <Input
                  value={form.mobileNumber}
                  onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Full Address *</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street, Area, City, State, PIN"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Landmark</Label>
                <Input
                  value={form.landmark}
                  onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))}
                  placeholder="Near landmark or reference point"
                />
              </div>
            </div>

            {/* GPS Section */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  GPS Coordinates
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGPS}
                  disabled={gpsLoading}
                  className="gap-1.5 text-xs"
                >
                  {gpsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5" />
                  )}
                  Use Current Location
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitude || ''}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g. 28.6139"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitude || ''}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g. 77.2090"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              {form.latitude !== 0 && form.longitude !== 0 && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Location set: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto underline hover:no-underline"
                  >
                    Preview
                  </a>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingIndex !== null ? 'Update Store' : 'Add Store'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this store? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteStore.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
