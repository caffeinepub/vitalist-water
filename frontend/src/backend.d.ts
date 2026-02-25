import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
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
export interface OrderRecord {
    status: string;
    storeId: bigint;
    rate: number;
    orderId: string;
    notes: string;
    timestamp: bigint;
    quantity: bigint;
}
export interface User {
    role: UserRole;
    email: string;
    hashedPassword: string;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addStore(store: Store): Promise<void>;
    addUser(user: User): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDistributorDelivery(delivery: DistributorDelivery): Promise<void>;
    createOrder(order: OrderRecord): Promise<void>;
    deleteDistributorDelivery(deliveryId: string): Promise<void>;
    deleteStore(id: bigint): Promise<void>;
    deleteUser(email: string): Promise<void>;
    getAllDistributorDeliveries(): Promise<Array<DistributorDelivery>>;
    getAllOrders(): Promise<Array<OrderRecord>>;
    getAllStores(): Promise<Array<Store>>;
    getAllUsers(): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDistributorDeliveriesByUser(distributor: Principal): Promise<Array<DistributorDelivery>>;
    getDistributorDelivery(deliveryId: string): Promise<DistributorDelivery | null>;
    getOrder(orderId: string): Promise<OrderRecord | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeSystem(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateDistributorDelivery(deliveryId: string, updatedDelivery: DistributorDelivery): Promise<void>;
    updateOrder(orderId: string, updatedOrder: OrderRecord): Promise<void>;
    updateStore(id: bigint, store: Store): Promise<void>;
    updateUser(email: string, updatedUser: User): Promise<void>;
}
