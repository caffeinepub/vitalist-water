import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Migration "migration";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

// Specify the data migration function in the main actor's with-clause
(with migration = Migration.run)
actor {
  public type AppUserRole = {
    #admin;
    #staff;
    #delivery;
    #distributor;
  };

  module AppUserRole {
    public func compare(a : AppUserRole, b : AppUserRole) : Order.Order {
      let rank = func(r : AppUserRole) : Nat {
        switch (r) {
          case (#admin) { 0 };
          case (#staff) { 1 };
          case (#delivery) { 2 };
          case (#distributor) { 3 };
        };
      };
      Nat.compare(rank(a), rank(b));
    };
  };

  public type User = {
    id : Text;
    email : Text;
    hashedPassword : Text;
    role : AppUserRole;
  };

  module User {
    public func compare(user1 : User, user2 : User) : Order.Order {
      switch (AppUserRole.compare(user1.role, user2.role)) {
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

  // Counter for generating unique user IDs
  var userIdCounter : Nat = 0;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Helper: generate a unique user ID
  func generateUserId() : Text {
    userIdCounter += 1;
    "user_" # userIdCounter.toText() # "_" # Time.now().toText();
  };

  // Helper: check if an email belongs to an admin user (session-based auth)
  func isAdminByEmail(email : Text) : Bool {
    switch (users.get(email)) {
      case (?user) {
        switch (user.role) {
          case (#admin) { true };
          case (_) { false };
        };
      };
      case (null) { false };
    };
  };

  // Helper: check if an email belongs to any known (non-guest) user
  func isKnownUser(email : Text) : Bool {
    switch (users.get(email)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  // Helper: check if caller is authenticated via Internet Identity OR email session
  func requireAdminAccess(
    caller : Principal,
    sessionEmail : Text,
  ) : () {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return;
    };
    if (isAdminByEmail(sessionEmail)) {
      return;
    };
    Runtime.trap("Unauthorized: Only admins can perform this action");
  };

  func requireUserAccess(caller : Principal, sessionEmail : Text) : () {
    if (AccessControl.hasPermission(accessControlState, caller, #user)) {
      return;
    };
    if (isKnownUser(sessionEmail)) {
      return;
    };
    Runtime.trap("Unauthorized: Only authenticated users can perform this action");
  };

  do {
    let seedUsers : [(Text, User)] = [
      (
        "admin@vitalist.com",
        {
          id = "user_seed_1";
          email = "admin@vitalist.com";
          hashedPassword = "hashed_admin_password";
          role = #admin;
        },
      ),
      (
        "shajan@vitalist.com",
        {
          id = "user_seed_2";
          email = "shajan@vitalist.com";
          hashedPassword = "India@123";
          role = #admin;
        },
      ),
      (
        "staff@vitalist.com",
        {
          id = "user_seed_3";
          email = "staff@vitalist.com";
          hashedPassword = "hashed_staff_password";
          role = #staff;
        },
      ),
      (
        "delivery@vitalist.com",
        {
          id = "user_seed_4";
          email = "delivery@vitalist.com";
          hashedPassword = "hashed_delivery_password";
          role = #delivery;
        },
      ),
      (
        "distributor@vitalist.com",
        {
          id = "user_seed_5";
          email = "distributor@vitalist.com";
          hashedPassword = "hashed_distributor_password";
          role = #distributor;
        },
      ),
    ];
    for ((key, user) in seedUsers.vals()) {
      if (not users.containsKey(key)) {
        users.add(key, user);
      };
    };
    userIdCounter := 5;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap(
        "Unauthorized: Only authenticated users can get their profile"
      );
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (
      caller != user
      and not AccessControl.isAdmin(accessControlState, caller)
    ) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func initializeSystem() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can initialize the system");
    };
    let seedUsers : [(Text, User)] = [
      (
        "admin@vitalist.com",
        {
          id = "user_seed_1";
          email = "admin@vitalist.com";
          hashedPassword = "hashed_admin_password";
          role = #admin;
        },
      ),
      (
        "shajan@vitalist.com",
        {
          id = "user_seed_2";
          email = "shajan@vitalist.com";
          hashedPassword = "India@123";
          role = #admin;
        },
      ),
      (
        "staff@vitalist.com",
        {
          id = "user_seed_3";
          email = "staff@vitalist.com";
          hashedPassword = "hashed_staff_password";
          role = #staff;
        },
      ),
      (
        "delivery@vitalist.com",
        {
          id = "user_seed_4";
          email = "delivery@vitalist.com";
          hashedPassword = "hashed_delivery_password";
          role = #delivery;
        },
      ),
      (
        "distributor@vitalist.com",
        {
          id = "user_seed_5";
          email = "distributor@vitalist.com";
          hashedPassword = "hashed_distributor_password";
          role = #distributor;
        },
      ),
    ];
    for ((key, user) in seedUsers.vals()) {
      if (not users.containsKey(key)) {
        users.add(key, user);
      };
    };
  };

  // Session-based login: returns a record with role and token if credentials match
  public query func login(email : Text, hashedPassword : Text) : async ?{
    role : Text;
    token : Text;
  } {
    switch (users.get(email)) {
      case (?user) {
        if (user.hashedPassword == hashedPassword) {
          let roleText = switch (user.role) {
            case (#admin) { "admin" };
            case (#staff) { "staff" };
            case (#delivery) { "delivery" };
            case (#distributor) { "distributor" };
          };
          // Token encodes email and role for session identification
          let token = email # ":" # roleText # ":" # user.id;
          ?{ role = roleText; token = token };
        } else {
          null;
        };
      };
      case (null) { null };
    };
  };

  // Store management

  public shared ({ caller }) func addStore(
    store : Store,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    let nextId = stores.size() + 1;
    stores.add(nextId, store);
  };

  public shared ({ caller }) func updateStore(
    id : Nat,
    store : Store,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (stores.get(id)) {
      case (null) { Runtime.trap("Store does not exist") };
      case (?_) {
        stores.add(id, store);
      };
    };
  };

  public shared ({ caller }) func deleteStore(
    id : Nat,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (stores.get(id)) {
      case (null) { Runtime.trap("Store does not exist") };
      case (?_) {
        stores.remove(id);
      };
    };
  };

  public query ({ caller }) func getAllStores(
    sessionEmail : Text,
  ) : async [Store] {
    requireUserAccess(caller, sessionEmail);
    stores.values().toArray().sort();
  };

  public shared ({ caller }) func createOrder(
    order : OrderRecord,
    sessionEmail : Text,
  ) : async () {
    requireUserAccess(caller, sessionEmail);
    if (orders.containsKey(order.orderId)) {
      Runtime.trap("Order ID already exists");
    };
    orders.add(order.orderId, order);
  };

  public shared ({ caller }) func updateOrder(
    orderId : Text,
    updatedOrder : OrderRecord,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?_) {
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getOrder(
    orderId : Text,
    sessionEmail : Text,
  ) : async ?OrderRecord {
    requireUserAccess(caller, sessionEmail);
    orders.get(orderId);
  };

  public query ({ caller }) func getAllOrders(
    sessionEmail : Text,
  ) : async [OrderRecord] {
    requireUserAccess(caller, sessionEmail);
    orders.values().toArray().sort();
  };

  // Admin-only: list all users — uses requireAdminAccess for consistency
  public query ({ caller }) func getAllUsers(
    sessionEmail : Text,
  ) : async [User] {
    requireAdminAccess(caller, sessionEmail);
    users.values().toArray().sort();
  };

  // Admin-only: add a new user and return the created user with assigned ID
  public shared ({ caller }) func addUser(
    userInput : { email : Text; hashedPassword : Text; role : AppUserRole },
    sessionEmail : Text,
  ) : async User {
    requireAdminAccess(caller, sessionEmail);
    if (users.containsKey(userInput.email)) {
      Runtime.trap("User with this email already exists");
    };
    let newId = generateUserId();
    let newUser : User = {
      id = newId;
      email = userInput.email;
      hashedPassword = userInput.hashedPassword;
      role = userInput.role;
    };
    users.add(userInput.email, newUser);
    newUser;
  };

  public shared ({ caller }) func updateUser(
    email : Text,
    updatedUser : User,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (users.get(email)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?_) {
        users.add(email, updatedUser);
      };
    };
  };

  public shared ({ caller }) func deleteUser(
    email : Text,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (users.get(email)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?_) {
        users.remove(email);
      };
    };
  };

  public shared ({ caller }) func createDistributorDelivery(
    delivery : DistributorDelivery,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    if (distributorDeliveries.containsKey(delivery.deliveryId)) {
      Runtime.trap("Delivery ID already exists");
    };
    distributorDeliveries.add(delivery.deliveryId, delivery);
  };

  public shared ({ caller }) func updateDistributorDelivery(
    deliveryId : Text,
    updatedDelivery : DistributorDelivery,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (distributorDeliveries.get(deliveryId)) {
      case (null) { Runtime.trap("Distributor delivery does not exist") };
      case (?_) {
        distributorDeliveries.add(deliveryId, updatedDelivery);
      };
    };
  };

  public shared ({ caller }) func deleteDistributorDelivery(
    deliveryId : Text,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (distributorDeliveries.get(deliveryId)) {
      case (null) { Runtime.trap("Distributor delivery does not exist") };
      case (?_) {
        distributorDeliveries.remove(deliveryId);
      };
    };
  };

  public query ({ caller }) func getAllDistributorDeliveries(
    sessionEmail : Text,
  ) : async [DistributorDelivery] {
    requireAdminAccess(caller, sessionEmail);
    distributorDeliveries.values().toArray().sort();
  };

  public query ({ caller }) func getDistributorDeliveriesByUser(
    distributor : Principal,
    sessionEmail : Text,
  ) : async [DistributorDelivery] {
    let callerIsAdmin = AccessControl.isAdmin(
      accessControlState,
      caller,
    ) or isAdminByEmail(sessionEmail);
    let callerIsOwner = caller == distributor;
    if (not callerIsAdmin and not callerIsOwner) {
      Runtime.trap("Unauthorized: Can only view your own deliveries");
    };
    let filteredList = List.empty<DistributorDelivery>();
    for (delivery in distributorDeliveries.values()) {
      if (delivery.distributor == distributor) {
        filteredList.add(delivery);
      };
    };
    filteredList.toArray();
  };

  public query ({ caller }) func getDistributorDelivery(
    deliveryId : Text,
    sessionEmail : Text,
  ) : async ?DistributorDelivery {
    let callerIsAdmin = AccessControl.isAdmin(
      accessControlState,
      caller,
    ) or isAdminByEmail(sessionEmail);
    if (not callerIsAdmin) {
      switch (distributorDeliveries.get(deliveryId)) {
        case (null) {
          Runtime.trap(
            "Unauthorized: Only admins or the assigned distributor can view this delivery"
          );
        };
        case (?delivery) {
          if (caller != delivery.distributor) {
            Runtime.trap(
              "Unauthorized: Only admins or the assigned distributor can view this delivery"
            );
          };
          return ?delivery;
        };
      };
    };
    distributorDeliveries.get(deliveryId);
  };
};
