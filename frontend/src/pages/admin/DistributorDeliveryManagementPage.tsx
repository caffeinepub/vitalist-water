import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Truck, Package, Phone, User, Calendar, FileText } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useGetAllDistributorDeliveries,
  useCreateDistributorDelivery,
  useUpdateDistributorDelivery,
  useDeleteDistributorDelivery,
  useGetAllOrders,
  useGetAllUsers,
} from '../../hooks/useQueries';
import type { DistributorDelivery } from '../../backend';
import { Principal } from '@icp-sdk/core/principal';

const emptyForm = {
  orderId: '',
  truckNumber: '',
  driverName: '',
  driverContact: '',
  distributorEmail: '',
  distributorPrincipal: '',
  estimatedDeliveryTime: '',
  notes: '',
};

type DeliveryForm = typeof emptyForm;

function generateDeliveryId(): string {
  return `DEL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

function formatDateTime(timestamp: bigint): string {
  try {
    const ms = Number(timestamp) / 1_000_000;
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

function datetimeLocalToNano(value: string): bigint {
  const ms = new Date(value).getTime();
  return BigInt(ms) * BigInt(1_000_000);
}

function nanoToDatetimeLocal(nano: bigint): string {
  try {
    const ms = Number(nano) / 1_000_000;
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export default function DistributorDeliveryManagementPage() {
  const { data: deliveries = [], isLoading } = useGetAllDistributorDeliveries();
  const { data: orders = [] } = useGetAllOrders();
  const { data: users = [] } = useGetAllUsers();

  const createDelivery = useCreateDistributorDelivery();
  const updateDelivery = useUpdateDistributorDelivery();
  const deleteDelivery = useDeleteDistributorDelivery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DistributorDelivery | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryForm>(emptyForm);
  const [search, setSearch] = useState('');

  const isMutating = createDelivery.isPending || updateDelivery.isPending;

  // Filter users with distributor role
  const distributorUsers = users.filter((u) => u.role === 'guest' || (u as any).role === 'distributor');

  // Filter approved orders
  const approvedOrders = orders.filter((o) => o.status === 'approved' || o.status === 'pending');

  const openAdd = () => {
    setEditingDelivery(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (delivery: DistributorDelivery) => {
    setEditingDelivery(delivery);
    setForm({
      orderId: delivery.orderId,
      truckNumber: delivery.truckNumber,
      driverName: delivery.driverName,
      driverContact: delivery.driverContact,
      distributorEmail: '',
      distributorPrincipal: delivery.distributor.toString(),
      estimatedDeliveryTime: nanoToDatetimeLocal(delivery.estimatedDeliveryTime),
      notes: delivery.notes,
    });
    setDialogOpen(true);
  };

  const openDelete = (deliveryId: string) => {
    setDeletingId(deliveryId);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId || !form.truckNumber.trim() || !form.driverName.trim() || !form.driverContact.trim() || !form.distributorPrincipal || !form.estimatedDeliveryTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    let distributorPrincipal: Principal;
    try {
      distributorPrincipal = Principal.fromText(form.distributorPrincipal);
    } catch {
      toast.error('Invalid distributor principal ID');
      return;
    }

    const deliveryData: DistributorDelivery = {
      deliveryId: editingDelivery ? editingDelivery.deliveryId : generateDeliveryId(),
      orderId: form.orderId,
      truckNumber: form.truckNumber.trim(),
      driverName: form.driverName.trim(),
      driverContact: form.driverContact.trim(),
      distributor: distributorPrincipal,
      estimatedDeliveryTime: datetimeLocalToNano(form.estimatedDeliveryTime),
      notes: form.notes.trim(),
    };

    try {
      if (editingDelivery) {
        await updateDelivery.mutateAsync({ deliveryId: editingDelivery.deliveryId, delivery: deliveryData });
        toast.success('Delivery record updated successfully');
      } else {
        await createDelivery.mutateAsync(deliveryData);
        toast.success('Delivery record created successfully');
      }
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Unauthorized') || msg.includes('Only admins')) {
        toast.error('Permission denied: Only admins can manage delivery records.');
      } else {
        toast.error(`Failed: ${msg}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDelivery.mutateAsync(deletingId);
      toast.success('Delivery record deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      toast.error(`Failed to delete: ${msg}`);
    }
  };

  const filteredDeliveries = deliveries.filter(
    (d) =>
      d.deliveryId.toLowerCase().includes(search.toLowerCase()) ||
      d.orderId.toLowerCase().includes(search.toLowerCase()) ||
      d.truckNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.driverName.toLowerCase().includes(search.toLowerCase())
  );

  const getOrderStatus = (orderId: string) => {
    const order = orders.find((o) => o.orderId === orderId);
    return order?.status || 'unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'delivered': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Distributor Deliveries</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage distributor delivery assignments</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Delivery
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">
              All Deliveries ({filteredDeliveries.length})
            </CardTitle>
            <Input
              placeholder="Search deliveries..."
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
          ) : filteredDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Truck className="w-10 h-10 opacity-30" />
              <p className="text-sm">No delivery records found</p>
              <Button variant="outline" size="sm" onClick={openAdd} className="mt-2">
                Add first delivery record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Truck No.</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Est. Delivery</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.deliveryId}>
                      <TableCell className="font-mono text-xs">{delivery.deliveryId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {delivery.orderId}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Truck className="w-3 h-3 text-muted-foreground" />
                          {delivery.truckNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {delivery.driverName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {delivery.driverContact}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(delivery.estimatedDeliveryTime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(getOrderStatus(delivery.orderId)) as any}>
                          {getOrderStatus(delivery.orderId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(delivery)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(delivery.deliveryId)}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDelivery ? 'Edit Delivery Record' : 'Add Distributor Delivery'}</DialogTitle>
            <DialogDescription>
              {editingDelivery ? 'Update delivery assignment details' : 'Assign a delivery to a distributor'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Order ID */}
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID *</Label>
              <Select
                value={form.orderId}
                onValueChange={(val) => setForm({ ...form, orderId: val })}
              >
                <SelectTrigger id="orderId">
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.length === 0 ? (
                    <SelectItem value="__none__" disabled>No orders available</SelectItem>
                  ) : (
                    orders.map((order) => (
                      <SelectItem key={order.orderId} value={order.orderId}>
                        {order.orderId} — {order.status}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Distributor Principal */}
            <div className="space-y-2">
              <Label htmlFor="distributorPrincipal">Distributor Principal ID *</Label>
              <Input
                id="distributorPrincipal"
                value={form.distributorPrincipal}
                onChange={(e) => setForm({ ...form, distributorPrincipal: e.target.value })}
                placeholder="e.g. aaaaa-aa or principal ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the Internet Identity principal ID of the distributor
              </p>
            </div>

            {/* Truck Number */}
            <div className="space-y-2">
              <Label htmlFor="truckNumber">Truck Number *</Label>
              <Input
                id="truckNumber"
                value={form.truckNumber}
                onChange={(e) => setForm({ ...form, truckNumber: e.target.value })}
                placeholder="e.g. MH-01-AB-1234"
                required
              />
            </div>

            {/* Driver Name */}
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name *</Label>
              <Input
                id="driverName"
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>

            {/* Driver Contact */}
            <div className="space-y-2">
              <Label htmlFor="driverContact">Driver Contact Number *</Label>
              <Input
                id="driverContact"
                type="tel"
                value={form.driverContact}
                onChange={(e) => setForm({ ...form, driverContact: e.target.value })}
                placeholder="+91 98765 43210"
                required
              />
            </div>

            {/* Estimated Delivery Time */}
            <div className="space-y-2">
              <Label htmlFor="estimatedDeliveryTime">Estimated Delivery Date & Time *</Label>
              <Input
                id="estimatedDeliveryTime"
                type="datetime-local"
                value={form.estimatedDeliveryTime}
                onChange={(e) => setForm({ ...form, estimatedDeliveryTime: e.target.value })}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
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
                ) : editingDelivery ? 'Update Delivery' : 'Create Delivery'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDelivery.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteDelivery.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDelivery.isPending ? (
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
