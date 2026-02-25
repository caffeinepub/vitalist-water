import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  useAllDistributorDeliveries,
  useCreateDistributorDelivery,
  useUpdateDistributorDelivery,
  useDeleteDistributorDelivery,
  useAllOrders,
} from '../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { useActor } from '../../hooks/useActor';
import { Principal } from '@dfinity/principal';
import { toast } from 'sonner';
import type { DistributorDelivery } from '../../backend';

interface DeliveryFormData {
  deliveryId: string;
  orderId: string;
  truckNumber: string;
  driverName: string;
  driverContact: string;
  distributorPrincipal: string;
  estimatedDeliveryTime: string;
  notes: string;
}

const defaultForm: DeliveryFormData = {
  deliveryId: '',
  orderId: '',
  truckNumber: '',
  driverName: '',
  driverContact: '',
  distributorPrincipal: '',
  estimatedDeliveryTime: '',
  notes: '',
};

function generateDeliveryId(): string {
  return `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export default function DistributorDeliveryManagementPage() {
  const { isAdmin, user } = useAuth();
  const { actor, isFetching: actorFetching } = useActor();
  const sessionEmail = user?.email ?? '';

  const { data: deliveries = [], isLoading, error } = useAllDistributorDeliveries(sessionEmail);
  const { data: orders = [] } = useAllOrders(sessionEmail);
  const createMutation = useCreateDistributorDelivery();
  const updateMutation = useUpdateDistributorDelivery();
  const deleteMutation = useDeleteDistributorDelivery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryFormData>(defaultForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const actorReady = !!actor && !actorFetching;
  const approvedOrders = orders.filter((o) => o.status === 'Approved');

  const openAddDialog = () => {
    setEditingId(null);
    setForm({ ...defaultForm, deliveryId: generateDeliveryId() });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (deliveryId: string) => {
    const delivery = deliveries.find((d) => d.deliveryId === deliveryId);
    if (!delivery) return;
    setEditingId(deliveryId);
    setForm({
      deliveryId: delivery.deliveryId,
      orderId: delivery.orderId,
      truckNumber: delivery.truckNumber,
      driverName: delivery.driverName,
      driverContact: delivery.driverContact,
      distributorPrincipal: delivery.distributor.toString(),
      estimatedDeliveryTime: new Date(Number(delivery.estimatedDeliveryTime) / 1_000_000)
        .toISOString()
        .slice(0, 16),
      notes: delivery.notes,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!actorReady) {
      setFormError('System is still initializing. Please wait a moment and try again.');
      return;
    }

    if (!form.orderId || !form.truckNumber.trim() || !form.driverName.trim()) {
      setFormError('Order, truck number, and driver name are required.');
      return;
    }

    let distributorPrincipal: Principal;
    try {
      distributorPrincipal = form.distributorPrincipal
        ? Principal.fromText(form.distributorPrincipal)
        : Principal.anonymous();
    } catch {
      setFormError('Invalid distributor principal ID.');
      return;
    }

    const estimatedTime = form.estimatedDeliveryTime
      ? BigInt(new Date(form.estimatedDeliveryTime).getTime()) * BigInt(1_000_000)
      : BigInt(Date.now()) * BigInt(1_000_000);

    const deliveryData: DistributorDelivery = {
      deliveryId: form.deliveryId,
      orderId: form.orderId,
      truckNumber: form.truckNumber.trim(),
      driverName: form.driverName.trim(),
      driverContact: form.driverContact.trim(),
      distributor: distributorPrincipal,
      estimatedDeliveryTime: estimatedTime,
      notes: form.notes.trim(),
    };

    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({
          deliveryId: editingId,
          updatedDelivery: deliveryData,
          sessionEmail,
        });
        toast.success('Delivery updated successfully');
      } else {
        await createMutation.mutateAsync({
          delivery: deliveryData,
          sessionEmail,
        });
        toast.success('Delivery created successfully');
      }
      setDialogOpen(false);
      setForm(defaultForm);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg.includes('Permission') ? 'Permission denied. Ensure you are logged in as admin.' : msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync({ deliveryId: deleteConfirmId, sessionEmail });
      toast.success('Delivery deleted successfully');
    } catch (err: unknown) {
      toast.error('Delete failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Distributor Deliveries</h1>
            <p className="text-sm text-muted-foreground">Manage distributor delivery assignments</p>
          </div>
        </div>
        <Button
          onClick={openAddDialog}
          disabled={!actorReady || !isAdmin}
          className="flex items-center gap-2"
        >
          {actorFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Delivery
        </Button>
      </div>

      {/* Deliveries Table */}
      {isLoading || actorFetching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load deliveries: {(error as Error).message}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery ID</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Est. Delivery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No deliveries found
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery) => (
                  <TableRow key={delivery.deliveryId}>
                    <TableCell className="font-mono text-sm">{delivery.deliveryId}</TableCell>
                    <TableCell className="font-mono text-sm">{delivery.orderId}</TableCell>
                    <TableCell>{delivery.truckNumber}</TableCell>
                    <TableCell>{delivery.driverName}</TableCell>
                    <TableCell>{delivery.driverContact}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(Number(delivery.estimatedDeliveryTime) / 1_000_000).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(delivery.deliveryId)}
                          disabled={!actorReady || !isAdmin || isMutating}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(delivery.deliveryId)}
                          disabled={!actorReady || !isAdmin || isMutating}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Edit Delivery' : 'Create Delivery'}</DialogTitle>
            <DialogDescription>
              {editingId !== null
                ? 'Update delivery details below.'
                : 'Fill in the details for the new delivery assignment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Delivery ID</Label>
              <Input value={form.deliveryId} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Order *</Label>
              <Select
                value={form.orderId}
                onValueChange={(val) => setForm((f) => ({ ...f, orderId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an approved order" />
                </SelectTrigger>
                <SelectContent>
                  {approvedOrders.length === 0 ? (
                    <SelectItem value="_none" disabled>No approved orders available</SelectItem>
                  ) : (
                    approvedOrders.map((o) => (
                      <SelectItem key={o.orderId} value={o.orderId}>
                        {o.orderId} — Qty: {Number(o.quantity)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Truck Number *</Label>
              <Input
                value={form.truckNumber}
                onChange={(e) => setForm((f) => ({ ...f, truckNumber: e.target.value }))}
                placeholder="e.g. KA-01-AB-1234"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Name *</Label>
              <Input
                value={form.driverName}
                onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
                placeholder="Enter driver name"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Contact</Label>
              <Input
                value={form.driverContact}
                onChange={(e) => setForm((f) => ({ ...f, driverContact: e.target.value }))}
                placeholder="Enter contact number"
              />
            </div>
            <div className="space-y-2">
              <Label>Distributor Principal ID</Label>
              <Input
                value={form.distributorPrincipal}
                onChange={(e) => setForm((f) => ({ ...f, distributorPrincipal: e.target.value }))}
                placeholder="Leave blank for anonymous"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Delivery Time</Label>
              <Input
                type="datetime-local"
                value={form.estimatedDeliveryTime}
                onChange={(e) => setForm((f) => ({ ...f, estimatedDeliveryTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating || !actorReady}>
              {isMutating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : editingId !== null ? 'Save Changes' : 'Create Delivery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery assignment? This action cannot be undone.
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
