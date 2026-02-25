import React, { useState } from 'react';
import { useGetAllUsers, useAddUser, useUpdateUser, useDeleteUser } from '../../hooks/useQueries';
import { User, UserRole } from '../../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Loader2, Users, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-green-100 text-green-800 border-green-200' },
  user: { label: 'Staff', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  guest: { label: 'Delivery', color: 'bg-blue-100 text-blue-800 border-blue-200' },
};

function hashPassword(password: string): string {
  // Simple hash for demo - in production use proper hashing
  return `hashed_${btoa(password)}`;
}

export default function UserManagementPage() {
  const { data: users = [], isLoading } = useGetAllUsers();
  const addUser = useAddUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', role: 'user' as 'admin' | 'user' | 'guest' });

  const openAdd = () => {
    setForm({ email: '', password: '', role: 'user' });
    setEditingEmail(null);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setForm({ email: user.email, password: '', role: user.role as 'admin' | 'user' | 'guest' });
    setEditingEmail(user.email);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmail) {
        const updatedUser: User = {
          email: form.email,
          hashedPassword: form.password ? hashPassword(form.password) : users.find((u) => u.email === editingEmail)?.hashedPassword ?? '',
          role: form.role === 'admin' ? UserRole.admin : form.role === 'user' ? UserRole.user : UserRole.guest,
        };
        await updateUser.mutateAsync({ email: editingEmail, updatedUser });
        toast.success('User updated successfully');
      } else {
        if (!form.password) {
          toast.error('Password is required for new users');
          return;
        }
        const newUser: User = {
          email: form.email,
          hashedPassword: hashPassword(form.password),
          role: form.role === 'admin' ? UserRole.admin : form.role === 'user' ? UserRole.user : UserRole.guest,
        };
        await addUser.mutateAsync(newUser);
        toast.success('User added successfully');
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!deleteEmail) return;
    try {
      await deleteUser.mutateAsync(deleteEmail);
      toast.success('User deleted');
      setDeleteEmail(null);
    } catch (err: unknown) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const isSaving = addUser.isPending || updateUser.isPending;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users and their roles</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(['admin', 'user', 'guest'] as const).map((role) => {
          const count = users.filter((u) => u.role === role).length;
          const info = ROLE_LABELS[role];
          return (
            <div key={role} className={`rounded-xl border p-4 card-shadow ${info.color.replace('text-', 'border-').split(' ')[0]} bg-white`}>
              <p className="text-xs text-muted-foreground">{info.label}s</p>
              <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: 'bg-gray-100 text-gray-700 border-gray-200' };
                return (
                  <TableRow key={user.email} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}>
                        <Shield className="h-3 w-3" />
                        {roleInfo.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteEmail(user.email)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmail ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@vitalist.com"
                required
                disabled={!!editingEmail}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{editingEmail ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingEmail ? 'Leave blank to keep current' : 'Enter password'}
                required={!editingEmail}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as 'admin' | 'user' | 'guest' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Staff</SelectItem>
                  <SelectItem value="guest">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingEmail ? 'Update User' : 'Add User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteEmail} onOpenChange={(o) => !o && setDeleteEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteEmail}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
