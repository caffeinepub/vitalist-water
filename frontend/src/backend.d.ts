import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Time = bigint;
export interface OrderRecord {
    status: string;
    invoicePDF?: Uint8Array;
    emptyTruckImage?: ExternalBlob;
    storeId: bigint;
    loadedTruckImage?: Uint8Array;
    rate: number;
    assignedDeliveryUser?: Principal;
    orderId: string;
    gpsLocation?: GpsLocation;
    notes: string;
    barcodeScan?: string;
    timestamp: bigint;
    quantity: bigint;
    unloadedTruckImage?: Uint8Array;
    qrCode?: QRCodeData;
}
export interface User {
    id: string;
    role: AppUserRole;
    email: string;
    hashedPassword: string;
}
export interface QRCodeData {
    value: string;
    scanned: boolean;
    scanTimestamp?: Time;
}
export interface DistributorDelivery {
    distributor: Principal;
    deliveryId: string;
    estimatedDeliveryTime: Time;
    orderId: string;
    driverContact: string;
    notes: string;
    truckNumber: string;
    driverName: string;
}
export interface GpsLocation {
    latitude: number;
    longitude: number;
    timestamp: bigint;
}
export interface CreateOrderInput {
    invoicePDF?: Uint8Array;
    storeId: bigint;
    rate: number;
    orderId: string;
    notes: string;
    timestamp: bigint;
    quantity: bigint;
}
export interface Store {
    latitude: number;
    ownerName: string;
    mobileNumber: string;
    longitude: number;
    address: string;
    storeName: string;
    timestamp: bigint;
    landmark: string;
}
export interface UserProfile {
    name: string;
    role: string;
    email: string;
}
export enum AppUserRole {
    admin = "admin",
    distributor = "distributor",
    staff = "staff",
    delivery = "delivery"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addEmptyTruckImage(orderId: string, file: ExternalBlob, sessionEmail: string): Promise<void>;
    addGpsLocation(orderId: string, latitude: number, longitude: number, sessionEmail: string): Promise<void>;
    addStore(store: Store, sessionEmail: string): Promise<void>;
    addUser(userInput: {
        role: AppUserRole;
        email: string;
        hashedPassword: string;
    }, sessionEmail: string): Promise<User>;
    approveOrder(orderId: string, newStatus: string, sessionEmail: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignDelivery(orderId: string, deliveryUser: Principal, sessionEmail: string): Promise<void>;
    createDistributorDelivery(delivery: DistributorDelivery, sessionEmail: string): Promise<void>;
    createOrder(input: CreateOrderInput, sessionEmail: string): Promise<void>;
    deleteDistributorDelivery(deliveryId: string, sessionEmail: string): Promise<void>;
    deleteStore(id: bigint, sessionEmail: string): Promise<void>;
    deleteUser(email: string, sessionEmail: string): Promise<void>;
    filterOrdersByStatus(status: string, sessionEmail: string): Promise<Array<OrderRecord>>;
    getAdminDashboardStats(sessionEmail: string): Promise<{
        activeDeliveries: bigint;
        pendingApproval: bigint;
        deliveredToday: bigint;
        confirmationsPending: bigint;
        totalOrdersToday: bigint;
        trucksInTransit: bigint;
    }>;
    getAllDistributorDeliveries(sessionEmail: string): Promise<Array<DistributorDelivery>>;
    getAllOrders(sessionEmail: string): Promise<Array<OrderRecord>>;
    getAllStores(sessionEmail: string): Promise<Array<Store>>;
    getAllUsers(sessionEmail: string): Promise<Array<User>>;
    getAssignedOrdersForDeliveryUser(deliveryUser: Principal, sessionEmail: string): Promise<Array<OrderRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDeliveryVerificationRecords(sessionEmail: string): Promise<Array<{
        distributor: Principal;
        emptyTruckImage?: ExternalBlob;
        loadedTruckImage?: Uint8Array;
        orderId: string;
        storeRecord?: Store;
        storeName: string;
        timestamp: bigint;
        orderContents: {
            rate: number;
            notes: string;
            quantity: bigint;
        };
        truckNumber: string;
        driverName: string;
        unloadedTruckImage?: Uint8Array;
    }>>;
    getDistributorDeliveriesByUser(distributor: Principal, sessionEmail: string): Promise<Array<DistributorDelivery>>;
    getDistributorDelivery(deliveryId: string, sessionEmail: string): Promise<DistributorDelivery | null>;
    getEmptyTruckImage(orderId: string, sessionEmail: string): Promise<ExternalBlob | null>;
    getLiveTrackingData(sessionEmail: string): Promise<Array<{
        status: string;
        orderId: string;
        location?: GpsLocation;
    }>>;
    getOrder(orderId: string, sessionEmail: string): Promise<OrderRecord | null>;
    getOrderWithImages(orderId: string, sessionEmail: string): Promise<OrderRecord | null>;
    getOrderWorkflowStatus(orderId: string, sessionEmail: string): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeSystem(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    login(email: string, hashedPassword: string): Promise<{
        token: string;
        role: string;
    } | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitDistributorConfirmation(orderId: string, barcodeScan: string, loadedTruckImage: Uint8Array, unloadedTruckImage: Uint8Array, sessionEmail: string): Promise<void>;
    updateDistributorDelivery(deliveryId: string, updatedDelivery: DistributorDelivery, sessionEmail: string): Promise<void>;
    updateOrder(orderId: string, updatedOrder: OrderRecord, sessionEmail: string): Promise<void>;
    updateOrderStatusByDeliveryUser(orderId: string, newStatus: string, sessionEmail: string): Promise<void>;
    updateOrderStatusUsingQR(orderId: string, qrCodeValue: string, sessionEmail: string): Promise<void>;
    updateStore(id: bigint, store: Store, sessionEmail: string): Promise<void>;
    updateUser(email: string, updatedUser: User, sessionEmail: string): Promise<void>;
}
