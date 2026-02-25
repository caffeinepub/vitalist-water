import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Store, OrderRecord, User, UserProfile, DistributorDelivery } from '../backend';
import { UserRole } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

// ─── Auth / Profile ──────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ['callerUserRole'],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      try {
        return await actor.getCallerUserRole();
      } catch {
        return UserRole.guest;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useAssignCallerUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ principal, role }: { principal: any; role: UserRole }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignCallerUserRole(principal, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['callerUserRole'] });
    },
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Stores ──────────────────────────────────────────────────────────────────

export function useGetAllStores() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStores();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (store: Store) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addStore(store);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useUpdateStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, store }: { id: bigint; store: Store }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateStore(id, store);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useDeleteStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteStore(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useGetAllOrders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetOrder(orderId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<OrderRecord | null>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getOrder(orderId);
    },
    enabled: !!actor && !actorFetching && !!orderId,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: OrderRecord) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, order }: { orderId: string; order: OrderRecord }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrder(orderId, order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function useGetAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: User) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, user }: { email: string; user: User }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateUser(email, user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteUser(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ─── System ──────────────────────────────────────────────────────────────────

export function useInitializeSystem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.initializeSystem();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

// ─── Distributor Deliveries ───────────────────────────────────────────────────

export function useGetAllDistributorDeliveries() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DistributorDelivery[]>({
    queryKey: ['distributorDeliveries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDistributorDeliveries();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetDistributorDeliveriesByUser(distributor: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DistributorDelivery[]>({
    queryKey: ['distributorDeliveries', 'byUser', distributor?.toString()],
    queryFn: async () => {
      if (!actor || !distributor) return [];
      return actor.getDistributorDeliveriesByUser(distributor);
    },
    enabled: !!actor && !actorFetching && !!distributor,
  });
}

export function useCreateDistributorDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delivery: DistributorDelivery) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createDistributorDelivery(delivery);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] });
    },
  });
}

export function useUpdateDistributorDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deliveryId, delivery }: { deliveryId: string; delivery: DistributorDelivery }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateDistributorDelivery(deliveryId, delivery);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] });
    },
  });
}

export function useDeleteDistributorDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteDistributorDelivery(deliveryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] });
    },
  });
}
