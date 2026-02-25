import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Store, OrderRecord, User } from '../backend';

// ─── Stores ───────────────────────────────────────────────────────────────────

export function useGetAllStores() {
  const { actor, isFetching } = useActor();
  return useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStores();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddStore() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (store: Store) => {
      if (!actor) throw new Error('Not connected');
      await actor.addStore(store);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useUpdateStore() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, store }: { id: bigint; store: Store }) => {
      if (!actor) throw new Error('Not connected');
      await actor.updateStore(id, store);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useDeleteStore() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Not connected');
      await actor.deleteStore(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useGetAllOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetOrder(orderId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<OrderRecord | null>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getOrder(orderId);
    },
    enabled: !!actor && !isFetching && !!orderId,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: OrderRecord) => {
      if (!actor) throw new Error('Not connected');
      await actor.createOrder(order);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, updatedOrder }: { orderId: string; updatedOrder: OrderRecord }) => {
      if (!actor) throw new Error('Not connected');
      await actor.updateOrder(orderId, updatedOrder);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function useGetAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: User) => {
      if (!actor) throw new Error('Not connected');
      await actor.addUser(user);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, updatedUser }: { email: string; updatedUser: User }) => {
      if (!actor) throw new Error('Not connected');
      await actor.updateUser(email, updatedUser);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error('Not connected');
      await actor.deleteUser(email);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
