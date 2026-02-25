import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { OrderRecord, Store, User, DistributorDelivery, CreateOrderInput, AppUserRole } from '../backend';
import { Principal } from '@dfinity/principal';

export type { AppUserRole };

export type AddUserInput = {
  email: string;
  hashedPassword: string;
  role: AppUserRole;
};

export function mapBackendRoleToAppRole(role: AppUserRole): string {
  switch (role) {
    case 'admin': return 'admin';
    case 'staff': return 'staff';
    case 'delivery': return 'delivery';
    case 'distributor': return 'distributor';
    default: return 'staff';
  }
}

export function mapAppRoleToBackendRole(role: string): AppUserRole {
  switch (role) {
    case 'admin': return 'admin' as AppUserRole;
    case 'staff': return 'staff' as AppUserRole;
    case 'delivery': return 'delivery' as AppUserRole;
    case 'distributor': return 'distributor' as AppUserRole;
    default: return 'staff' as AppUserRole;
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useAllOrders(sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });
}

export function useGetOrder(orderId: string | null, sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<OrderRecord | null>({
    queryKey: ['order', orderId, sessionEmail],
    queryFn: async () => {
      if (!actor || !orderId) return null;
      return actor.getOrder(orderId, sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!orderId && !!sessionEmail,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, sessionEmail }: { input: CreateOrderInput; sessionEmail: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(input, sessionEmail);
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
    mutationFn: async ({
      orderId,
      updatedOrder,
      sessionEmail,
    }: {
      orderId: string;
      updatedOrder: OrderRecord;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrder(orderId, updatedOrder, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });
    },
  });
}

export function useApproveOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      sessionEmail,
    }: {
      orderId: string;
      newStatus: string;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveOrder(orderId, newStatus, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });
    },
  });
}

export function useUpdateOrderStatusUsingQR() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      qrCodeValue,
      sessionEmail,
    }: {
      orderId: string;
      qrCodeValue: string;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrderStatusUsingQR(orderId, qrCodeValue, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });
    },
  });
}

export function useAssignDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      deliveryUser,
      sessionEmail,
    }: {
      orderId: string;
      deliveryUser: Principal;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignDelivery(orderId, deliveryUser, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });
    },
  });
}

export function useUpdateOrderStatusByDeliveryUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      sessionEmail,
    }: {
      orderId: string;
      newStatus: string;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrderStatusByDeliveryUser(orderId, newStatus, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });
    },
  });
}

// ─── Assigned Orders for Delivery ─────────────────────────────────────────────

export function useGetAssignedOrdersForDeliveryUser(
  deliveryUserPrincipal: Principal | null,
  sessionEmail: string
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<OrderRecord[]>({
    queryKey: ['assignedOrders', deliveryUserPrincipal?.toString(), sessionEmail],
    queryFn: async () => {
      if (!actor || !deliveryUserPrincipal) return [];
      try {
        return await actor.getAssignedOrdersForDeliveryUser(deliveryUserPrincipal, sessionEmail);
      } catch (err) {
        console.error('Error fetching assigned orders:', err);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!deliveryUserPrincipal && !!sessionEmail,
    refetchInterval: 15000,
  });
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export function useAllStores(sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Store[]>({
    queryKey: ['stores', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStores(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });
}

export function useAddStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ store, sessionEmail }: { store: Store; sessionEmail: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addStore(store, sessionEmail);
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
    mutationFn: async ({
      id,
      store,
      sessionEmail,
    }: {
      id: bigint;
      store: Store;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateStore(id, store, sessionEmail);
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
    mutationFn: async ({ id, sessionEmail }: { id: bigint; sessionEmail: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteStore(id, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function useAllUsers(sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['users', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });
}

export function useAddUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userInput,
      sessionEmail,
    }: {
      userInput: AddUserInput;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addUser(userInput, sessionEmail);
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
    mutationFn: async ({
      email,
      updatedUser,
      sessionEmail,
    }: {
      email: string;
      updatedUser: User;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateUser(email, updatedUser, sessionEmail);
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
    mutationFn: async ({ email, sessionEmail }: { email: string; sessionEmail: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteUser(email, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ─── Distributor Deliveries ───────────────────────────────────────────────────

export function useAllDistributorDeliveries(sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DistributorDelivery[]>({
    queryKey: ['distributorDeliveries', sessionEmail],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDistributorDeliveries(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });
}

export function useDistributorDeliveriesByUser(
  distributor: Principal | null,
  sessionEmail: string
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DistributorDelivery[]>({
    queryKey: ['distributorDeliveriesByUser', distributor?.toString(), sessionEmail],
    queryFn: async () => {
      if (!actor || !distributor) return [];
      return actor.getDistributorDeliveriesByUser(distributor, sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!distributor && !!sessionEmail,
  });
}

export function useCreateDistributorDelivery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      delivery,
      sessionEmail,
    }: {
      delivery: DistributorDelivery;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createDistributorDelivery(delivery, sessionEmail);
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
    mutationFn: async ({
      deliveryId,
      updatedDelivery,
      sessionEmail,
    }: {
      deliveryId: string;
      updatedDelivery: DistributorDelivery;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateDistributorDelivery(deliveryId, updatedDelivery, sessionEmail);
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
    mutationFn: async ({
      deliveryId,
      sessionEmail,
    }: {
      deliveryId: string;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteDistributorDelivery(deliveryId, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] });
    },
  });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function useAdminDashboardStats(sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['adminDashboardStats', sessionEmail],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAdminDashboardStats(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });
}

// ─── Delivery Verification ────────────────────────────────────────────────────

export function useDeliveryVerificationRecords(sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['deliveryVerificationRecords', sessionEmail],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getDeliveryVerificationRecords(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
  });
}

// ─── Submit Distributor Confirmation ─────────────────────────────────────────

export function useSubmitDistributorConfirmation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      barcodeScan,
      loadedTruckImage,
      unloadedTruckImage,
      sessionEmail,
    }: {
      orderId: string;
      barcodeScan: string;
      loadedTruckImage: Uint8Array;
      unloadedTruckImage: Uint8Array;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitDistributorConfirmation(
        orderId,
        barcodeScan,
        loadedTruckImage,
        unloadedTruckImage,
        sessionEmail
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['distributorDeliveries'] });
    },
  });
}

// ─── GPS Location ─────────────────────────────────────────────────────────────

export function useAddGpsLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      latitude,
      longitude,
      sessionEmail,
    }: {
      orderId: string;
      latitude: number;
      longitude: number;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addGpsLocation(orderId, latitude, longitude, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// ─── Empty Truck Image ────────────────────────────────────────────────────────

export function useAddEmptyTruckImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      file,
      sessionEmail,
    }: {
      orderId: string;
      file: import('../backend').ExternalBlob;
      sessionEmail: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addEmptyTruckImage(orderId, file, sessionEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// ─── Live Tracking ────────────────────────────────────────────────────────────

export function useLiveTrackingData(sessionEmail: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['liveTrackingData', sessionEmail],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getLiveTrackingData(sessionEmail);
    },
    enabled: !!actor && !actorFetching && !!sessionEmail,
    refetchInterval: 30000,
  });
}
