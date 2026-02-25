import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAllUsers, useAddUser, useUpdateUser, useDeleteUser } from '../../hooks/useQueries';
import { UserRole } from '../../backend';
import type { User } from '../../backend';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.admin]: 'Admin',
  [UserRole.user]: 'Staff',
  [UserRole.guest]: 'Delivery',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  [UserRole.admin]: 'default',
  [UserRole.user]: 'secondary',
  [UserRole.guest]: 'outline',
};

const emptyForm = {
  email: '',
  password: '',
  role: UserRole.user as UserRole,
};

type UserForm = typeof emptyForm;

export default function UserManagementPage() {
  const { data: users = [], isLoading } = useGetAllUsers();
  const addUser = useAddUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [search, setSearch] = useState('');

  const isMutating = addUser.isPending || updateUser.isPending;

  const openAdd = () => {
    setEditingEmail(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingEmail(user.email);
    setForm({ email: user.email, password: '', role: user.role });
    setDialogOpen(true);
  };

  const openDelete = (email: string) => {
    setDeletingEmail(email);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!editingEmail && !form.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }

    const userData: User = {
      email: form.email.trim().toLowerCase(),
      hashedPassword: form.password ? `hashed_${form.password}` : (editingEmail ? users.find(u => u.email === editingEmail)?.hashedPassword || '' : ''),
      role: form.role,
    };

    try {
      if (editingEmail) {
        await updateUser.mutateAsync({ email: editingEmail, user: userData });
        toast.success('User updated successfully');
      } else {
        await addUser.mutateAsync(userData);
        toast.success('User added successfully');
      }
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Only admins') || msg.includes('Unauthorized')) {
        toast.error('Permission denied: Only admins can manage users.');
      } else if (msg.includes('already exists')) {
        toast.error('A user with this email already exists.');
      } else {
        toast.error(`Failed: ${msg}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingEmail) return;
    try {
      await deleteUser.mutateAsync(deletingEmail);
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingEmail(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Only admins') || msg.includes('Unauthorized')) {
        toast.error('Permission denied: Only admins can delete users.');
      } else {
        toast.error(`Failed to delete user: ${msg}`);
      }
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users and roles</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">
              All Users ({filteredUsers.length})
            </CardTitle>
            <Input
              placeholder="Search users..."
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
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => (
                    <TableRow key={user.email}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANTS[user.role] || 'outline'}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(user)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(user.email)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmail ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingEmail ? 'Update user information' : 'Create a new system user'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@vitalist.com"
                disabled={!!editingEmail}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPassword">
                Password {editingEmail ? '(leave blank to keep current)' : '*'}
              </Label>
              <Input
                id="userPassword"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userRole">Role *</Label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm({ ...form, role: val as UserRole })}
              >
                <SelectTrigger id="userRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.admin}>Admin</SelectItem>
                  <SelectItem value={UserRole.user}>Staff</SelectItem>
                  <SelectItem value={UserRole.guest}>Delivery</SelectItem>
                </SelectContent>
              </Select>
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
                ) : editingEmail ? 'Update User' : 'Add User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingEmail}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? (
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
