import Array "mo:core/Array";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Order "mo:core/Order";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Iter "mo:core/Iter";
import Migration "migration";

(with migration = Migration.run)
actor {
  type UserRole = AccessControl.UserRole;

  module UserRole {
    public func compare(a : UserRole, b : UserRole) : Order.Order {
      switch (a, b) {
        case (#admin, #admin) { #equal };
        case (#user, #user) { #equal };
        case (#guest, #guest) { #equal };
        case (#admin, _) { #less };
        case (#user, #guest) { #less };
        case (_, _) { #greater };
      };
    };
  };

  public type User = {
    email : Text;
    hashedPassword : Text;
    role : UserRole;
  };

  module User {
    public func compare(user1 : User, user2 : User) : Order.Order {
      switch (UserRole.compare(user1.role, user2.role)) {
        case (#equal) { Text.compare(user1.email, user2.email) };
        case (order) { order };
      };
    };
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
  };

  let users = Map.empty<Text, User>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  public type Store = {
    storeName : Text;
    ownerName : Text;
    mobileNumber : Text;
    address : Text;
    landmark : Text;
    latitude : Float;
    longitude : Float;
    timestamp : Int;
  };

  module Store {
    public func compare(store1 : Store, store2 : Store) : Order.Order {
      Int.compare(store1.timestamp, store2.timestamp);
    };
  };

  let stores = Map.empty<Nat, Store>();

  public type OrderRecord = {
    orderId : Text;
    storeId : Nat;
    quantity : Nat;
    rate : Float;
    notes : Text;
    status : Text;
    timestamp : Int;
  };

  module OrderRecord {
    public func compare(order1 : OrderRecord, order2 : OrderRecord) : Order.Order {
      Text.compare(order1.orderId, order2.orderId);
    };
  };

  let orders = Map.empty<Text, OrderRecord>();

  public type DistributorDelivery = {
    deliveryId : Text;
    orderId : Text;
    truckNumber : Text;
    driverName : Text;
    driverContact : Text;
    distributor : Principal;
    estimatedDeliveryTime : Time.Time;
    notes : Text;
  };

  module DistributorDelivery {
    public func compare(delivery1 : DistributorDelivery, delivery2 : DistributorDelivery) : Order.Order {
      Text.compare(delivery1.deliveryId, delivery2.deliveryId);
    };
  };

  let distributorDeliveries = Map.empty<Text, DistributorDelivery>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can get their profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func initializeSystem() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can initialize the system");
    };
    switch (users.get("admin@vitalist.com")) {
      case (null) {
        let demoUsers : [User] = [
          {
            email = "admin@vitalist.com";
            hashedPassword = "hashed_admin_password";
            role = #admin;
          },
          {
            email = "staff@vitalist.com";
            hashedPassword = "hashed_staff_password";
            role = #user;
          },
          {
            email = "delivery@vitalist.com";
            hashedPassword = "hashed_delivery_password";
            role = #guest;
          },
        ];
        for (user in demoUsers.values()) {
          users.add(user.email, user);
        };
      };
      case (?_) { return };
    };
  };

  public shared ({ caller }) func addStore(store : Store) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add stores");
    };
    let nextId = stores.size() + 1;
    stores.add(nextId, store);
  };

  public shared ({ caller }) func updateStore(id : Nat, store : Store) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update stores");
    };
    switch (stores.get(id)) {
      case (null) { Runtime.trap("Store does not exist") };
      case (?_) {
        stores.add(id, store);
      };
    };
  };

  public shared ({ caller }) func deleteStore(id : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete stores");
    };
    switch (stores.get(id)) {
      case (null) { Runtime.trap("Store does not exist") };
      case (?_) {
        stores.remove(id);
      };
    };
  };

  public query ({ caller }) func getAllStores() : async [Store] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view stores");
    };
    stores.values().toArray().sort();
  };

  public shared ({ caller }) func createOrder(order : OrderRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create orders");
    };
    if (orders.containsKey(order.orderId)) {
      Runtime.trap("Order ID already exists");
    };
    orders.add(order.orderId, order);
  };

  public shared ({ caller }) func updateOrder(orderId : Text, updatedOrder : OrderRecord) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update orders");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?_) {
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getOrder(orderId : Text) : async ?OrderRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view orders");
    };
    orders.get(orderId);
  };

  public query ({ caller }) func getAllOrders() : async [OrderRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view orders");
    };
    orders.values().toArray().sort();
  };

  public query ({ caller }) func getAllUsers() : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list users");
    };
    users.values().toArray().sort();
  };

  public shared ({ caller }) func addUser(user : User) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add users");
    };
    if (users.containsKey(user.email)) {
      Runtime.trap("User with this email already exists");
    };
    users.add(user.email, user);
  };

  public shared ({ caller }) func updateUser(email : Text, updatedUser : User) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update users");
    };
    switch (users.get(email)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?_) {
        users.add(email, updatedUser);
      };
    };
  };

  public shared ({ caller }) func deleteUser(email : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete users");
    };
    switch (users.get(email)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?_) {
        users.remove(email);
      };
    };
  };

  // Distributor Delivery Data Management

  public shared ({ caller }) func createDistributorDelivery(delivery : DistributorDelivery) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create distributor deliveries");
    };
    if (distributorDeliveries.containsKey(delivery.deliveryId)) {
      Runtime.trap("Delivery ID already exists");
    };
    distributorDeliveries.add(delivery.deliveryId, delivery);
  };

  public shared ({ caller }) func updateDistributorDelivery(deliveryId : Text, updatedDelivery : DistributorDelivery) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update distributor deliveries");
    };
    switch (distributorDeliveries.get(deliveryId)) {
      case (null) { Runtime.trap("Distributor delivery does not exist") };
      case (?_) {
        distributorDeliveries.add(deliveryId, updatedDelivery);
      };
    };
  };

  public shared ({ caller }) func deleteDistributorDelivery(deliveryId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete distributor deliveries");
    };
    switch (distributorDeliveries.get(deliveryId)) {
      case (null) { Runtime.trap("Distributor delivery does not exist") };
      case (?_) {
        distributorDeliveries.remove(deliveryId);
      };
    };
  };

  // Admin: list all distributor delivery records
  public query ({ caller }) func getAllDistributorDeliveries() : async [DistributorDelivery] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all distributor deliveries");
    };
    distributorDeliveries.values().toArray().sort();
  };

  // Distributor role (or admin): filter deliveries by distributor principal
  public query ({ caller }) func getDistributorDeliveriesByUser(distributor : Principal) : async [DistributorDelivery] {
    // Only the distributor themselves or an admin may query this
    if (caller != distributor and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own deliveries");
    };
    // Require at least authenticated user (not anonymous guest) unless admin
    if (not AccessControl.isAdmin(accessControlState, caller) and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view deliveries");
    };
    let filteredList = List.empty<DistributorDelivery>();
    for (delivery in distributorDeliveries.values()) {
      if (delivery.distributor == distributor) {
        filteredList.add(delivery);
      };
    };
    filteredList.toArray();
  };

  // Fetch a single delivery: only the assigned distributor or an admin may view it
  public query ({ caller }) func getDistributorDelivery(deliveryId : Text) : async ?DistributorDelivery {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      // Non-admin: must be the assigned distributor for this delivery
      switch (distributorDeliveries.get(deliveryId)) {
        case (null) {
          // Delivery not found; return null without leaking existence to unauthorized callers
          Runtime.trap("Unauthorized: Only admins or the assigned distributor can view this delivery");
        };
        case (?delivery) {
          if (caller != delivery.distributor) {
            Runtime.trap("Unauthorized: Only admins or the assigned distributor can view this delivery");
          };
          return ?delivery;
        };
      };
    };
    distributorDeliveries.get(deliveryId);
  };
};
