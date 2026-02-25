import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
export interface OrderRecord {
    status: string;
    storeId: bigint;
    rate: number;
    orderId: string;
    notes: string;
    timestamp: bigint;
    quantity: bigint;
}
export interface UserProfile {
    name: string;
    role: string;
    email: string;
}
export interface User {
    role: UserRole;
    email: string;
    hashedPassword: string;
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
    createOrder(order: OrderRecord): Promise<void>;
    deleteStore(id: bigint): Promise<void>;
    deleteUser(email: string): Promise<void>;
    getAllOrders(): Promise<Array<OrderRecord>>;
    getAllStores(): Promise<Array<Store>>;
    getAllUsers(): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getOrder(orderId: string): Promise<OrderRecord | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeSystem(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateOrder(orderId: string, updatedOrder: OrderRecord): Promise<void>;
    updateStore(id: bigint, store: Store): Promise<void>;
    updateUser(email: string, updatedUser: User): Promise<void>;
}
