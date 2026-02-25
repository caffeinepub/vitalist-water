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
    id: string;
    role: AppUserRole;
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
    addStore(store: Store, sessionEmail: string): Promise<void>;
    addUser(userInput: {
        role: AppUserRole;
        email: string;
        hashedPassword: string;
    }, sessionEmail: string): Promise<User>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDistributorDelivery(delivery: DistributorDelivery, sessionEmail: string): Promise<void>;
    createOrder(order: OrderRecord, sessionEmail: string): Promise<void>;
    deleteDistributorDelivery(deliveryId: string, sessionEmail: string): Promise<void>;
    deleteStore(id: bigint, sessionEmail: string): Promise<void>;
    deleteUser(email: string, sessionEmail: string): Promise<void>;
    getAllDistributorDeliveries(sessionEmail: string): Promise<Array<DistributorDelivery>>;
    getAllOrders(sessionEmail: string): Promise<Array<OrderRecord>>;
    getAllStores(sessionEmail: string): Promise<Array<Store>>;
    getAllUsers(sessionEmail: string): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDistributorDeliveriesByUser(distributor: Principal, sessionEmail: string): Promise<Array<DistributorDelivery>>;
    getDistributorDelivery(deliveryId: string, sessionEmail: string): Promise<DistributorDelivery | null>;
    getOrder(orderId: string, sessionEmail: string): Promise<OrderRecord | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeSystem(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    login(email: string, hashedPassword: string): Promise<{
        token: string;
        role: string;
    } | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateDistributorDelivery(deliveryId: string, updatedDelivery: DistributorDelivery, sessionEmail: string): Promise<void>;
    updateOrder(orderId: string, updatedOrder: OrderRecord, sessionEmail: string): Promise<void>;
    updateStore(id: bigint, store: Store, sessionEmail: string): Promise<void>;
    updateUser(email: string, updatedUser: User, sessionEmail: string): Promise<void>;
}
