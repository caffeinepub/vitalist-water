import React, { useState } from 'react';
import { useAllUsers, useAddUser, useUpdateUser, useDeleteUser, AddUserInput } from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { User, AppUserRole } from '../../backend';
import { mapAppRoleToBackendRole, mapBackendRoleToAppRole } from '../../hooks/useQueries';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'staff' | 'delivery' | 'distributor';

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'distributor', label: 'Distributor' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  delivery: 'Delivery',
  distributor: 'Distributor',
};

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  staff: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  delivery: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  distributor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const emptyForm = () => ({ email: '', password: '', role: 'staff' as AppRole });

export default function UserManagementPage() {
  const { actor, isFetching: actorFetching } = useActor();
  const { data: users = [], isLoading } = useAllUsers();
  const addUserMutation = useAddUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const actorReady = !!actor && !actorFetching;

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.id && u.id.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: user.hashedPassword,
      role: mapBackendRoleToAppRole(user.role) as AppRole,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      toast.error('Email and password are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser !== null) {
        // For update, pass the full User object with the existing id
        const updatedUser: User = {
          id: editingUser.id,
          email: editingUser.email,
          hashedPassword: form.password,
          role: mapAppRoleToBackendRole(form.role),
        };
        await updateUserMutation.mutateAsync({ email: editingUser.email, user: updatedUser });
        toast.success('User updated successfully');
      } else {
        // For add, pass only the input fields — backend generates the id
        const addInput: AddUserInput = {
          email: form.email.trim().toLowerCase(),
          hashedPassword: form.password,
          role: mapAppRoleToBackendRole(form.role),
        };
        await addUserMutation.mutateAsync(addInput);
        toast.success('User added successfully');
      }
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('Unauthorized') || msg.includes('permission')) {
        toast.error('Permission denied. Please log out and log back in.');
      } else if (msg.includes('already exists')) {
        toast.error('A user with this email already exists.');
      } else {
        toast.error(`Failed to save user: ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmEmail) return;
    try {
      await deleteUserMutation.mutateAsync(deleteConfirmEmail);
      toast.success('User deleted successfully');
    } catch (err: any) {
      toast.error(`Failed to delete user: ${err?.message ?? err}`);
    } finally {
      setDeleteConfirmEmail(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users and their roles</p>
        </div>
        <Button onClick={openAdd} disabled={!actorReady} className="gap-2">
          {actorFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by email or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || actorFetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">User ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const appRole = mapBackendRoleToAppRole(user.role);
                    return (
                      <TableRow key={user.email}>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {user.id || <span className="italic opacity-50">—</span>}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ROLE_BADGE_VARIANTS[appRole] ?? 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {ROLE_LABELS[appRole] ?? appRole}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(user)}
                              disabled={!actorReady}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmEmail(user.email)}
                              disabled={!actorReady}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser !== null ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {editingUser && (
              <div className="grid gap-1.5">
                <Label className="text-muted-foreground text-xs">User ID</Label>
                <p className="font-mono text-xs bg-muted px-3 py-2 rounded border border-border">
                  {editingUser.id}
                </p>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={editingUser !== null}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Password *</Label>
              <Input
                type="text"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Role *</Label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm((f) => ({ ...f, role: val as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingUser !== null ? 'Update' : 'Add'} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteConfirmEmail !== null} onOpenChange={(o) => !o && setDeleteConfirmEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmEmail}</strong>? This action cannot be undone.
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
