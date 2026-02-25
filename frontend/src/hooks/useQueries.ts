import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Store, OrderRecord, User, AppUserRole, DistributorDelivery } from '../backend';
import { Principal } from '@dfinity/principal';

// ── Role helpers ──────────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'staff' | 'delivery' | 'distributor';

export function mapBackendRoleToAppRole(role: AppUserRole): AppRole {
  switch (role) {
    case AppUserRole.admin:
      return 'admin';
    case AppUserRole.staff:
      return 'staff';
    case AppUserRole.delivery:
      return 'delivery';
    case AppUserRole.distributor:
      return 'distributor';
    default:
      return 'staff';
  }
}

export function mapAppRoleToBackendRole(role: AppRole): AppUserRole {
  switch (role) {
    case 'admin':
      return AppUserRole.admin;
    case 'staff':
      return AppUserRole.staff;
    case 'delivery':
      return AppUserRole.delivery;
    case 'distributor':
      return AppUserRole.distributor;
    default:
      return AppUserRole.staff;
  }
}

// ── Session helper ────────────────────────────────────────────────────────────

function getSessionEmail(): string {
  const email = sessionStorage.getItem('userEmail') ?? '';
  if (!email) {
    console.warn('[useQueries] sessionEmail is missing from sessionStorage. Backend calls requiring auth may fail.');
  }
  return email;
}

// ── Stores ────────────────────────────────────────────────────────────────────

export function useAllStores() {
  const { actor, isFetching } = useActor();
  return useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      if (!actor) return [];
      const sessionEmail = getSessionEmail();
      return actor.getAllStores(sessionEmail);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (store: Store) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useAddStore] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.addStore(store, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useUpdateStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, store }: { id: bigint; store: Store }) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useUpdateStore] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.updateStore(id, store, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useDeleteStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useDeleteStore] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.deleteStore(id, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  });
}

// ── Orders ────────────────────────────────────────────────────────────────────

export function useAllOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      const sessionEmail = getSessionEmail();
      return actor.getAllOrders(sessionEmail);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (order: OrderRecord) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useCreateOrder] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.createOrder(order, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, order }: { orderId: string; order: OrderRecord }) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useUpdateOrder] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.updateOrder(orderId, order, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function useAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      if (!actor) return [];
      // getAllUsers requires sessionEmail for admin access check
      const sessionEmail = getSessionEmail();
      return actor.getAllUsers(sessionEmail);
    },
    enabled: !!actor && !isFetching,
  });
}

// Input type for adding a new user (no id — backend generates it)
export type AddUserInput = {
  email: string;
  hashedPassword: string;
  role: AppUserRole;
};

export function useAddUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddUserInput) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useAddUser] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      // actor.addUser expects { email, hashedPassword, role } and returns the created User with id
      return actor.addUser(
        { email: input.email, hashedPassword: input.hashedPassword, role: input.role },
        sessionEmail
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, user }: { email: string; user: User }) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useUpdateUser] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.updateUser(email, user, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useDeleteUser] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.deleteUser(email, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ── Distributor Deliveries ────────────────────────────────────────────────────

export function useAllDistributorDeliveries() {
  const { actor, isFetching } = useActor();
  return useQuery<DistributorDelivery[]>({
    queryKey: ['distributorDeliveries'],
    queryFn: async () => {
      if (!actor) return [];
      const sessionEmail = getSessionEmail();
      return actor.getAllDistributorDeliveries(sessionEmail);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDistributorDeliveriesByUser(distributorPrincipal: string | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<DistributorDelivery[]>({
    queryKey: ['distributorDeliveries', 'byUser', distributorPrincipal],
    queryFn: async () => {
      if (!actor || !distributorPrincipal) return [];
      const sessionEmail = getSessionEmail();
      return actor.getDistributorDeliveriesByUser(Principal.fromText(distributorPrincipal), sessionEmail);
    },
    enabled: !!actor && !isFetching && !!distributorPrincipal,
  });
}

export function useCreateDistributorDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (delivery: DistributorDelivery) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useCreateDistributorDelivery] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.createDistributorDelivery(delivery, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] }),
  });
}

export function useUpdateDistributorDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deliveryId, delivery }: { deliveryId: string; delivery: DistributorDelivery }) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useUpdateDistributorDelivery] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.updateDistributorDelivery(deliveryId, delivery, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] }),
  });
}

export function useDeleteDistributorDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      if (!actor) throw new Error('Actor not available');
      const sessionEmail = getSessionEmail();
      if (!sessionEmail) {
        console.error('[useDeleteDistributorDelivery] sessionEmail is missing — permission will be denied by backend.');
        throw new Error('Session expired. Please log out and log back in.');
      }
      return actor.deleteDistributorDelivery(deliveryId, sessionEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] }),
  });
}
