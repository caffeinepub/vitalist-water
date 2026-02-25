import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Blob "mo:core/Blob";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  public type AppUserRole = {
    #admin;
    #staff;
    #delivery;
    #distributor;
  };

  type User = {
    id : Text;
    email : Text;
    hashedPassword : Text;
    role : AppUserRole;
  };

  type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
  };

  type Store = {
    storeName : Text;
    ownerName : Text;
    mobileNumber : Text;
    address : Text;
    landmark : Text;
    latitude : Float;
    longitude : Float;
    timestamp : Int;
  };

  type QRCodeData = {
    value : Text;
    scanned : Bool;
    scanTimestamp : ?Time.Time;
  };

  type GpsLocation = {
    latitude : Float;
    longitude : Float;
    timestamp : Int;
  };

  type OrderRecord = {
    orderId : Text;
    storeId : Nat;
    quantity : Nat;
    rate : Float;
    notes : Text;
    status : Text;
    timestamp : Int;
    qrCode : ?QRCodeData;
    invoicePDF : ?Blob;
    barcodeScan : ?Text;
    loadedTruckImage : ?Blob;
    unloadedTruckImage : ?Blob;
    gpsLocation : ?GpsLocation;
    emptyTruckImage : ?Storage.ExternalBlob;
    assignedDeliveryUser : ?Principal;
  };

  type DistributorDelivery = {
    deliveryId : Text;
    orderId : Text;
    truckNumber : Text;
    driverName : Text;
    driverContact : Text;
    distributor : Principal;
    estimatedDeliveryTime : Time.Time;
    notes : Text;
  };

  let users = Map.empty<Text, User>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let stores = Map.empty<Nat, Store>();
  let orders = Map.empty<Text, OrderRecord>();
  let distributorDeliveries = Map.empty<Text, DistributorDelivery>();
  var userIdCounter = 0;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  func generateUserId() : Text {
    userIdCounter += 1;
    "user_" # userIdCounter.toText() # "_" # Time.now().toText();
  };

  func isAdminByEmail(email : Text) : Bool {
    switch (users.get(email)) {
      case (?user) { switch (user.role) { case (#admin) { true }; case (_) { false } } };
      case (null) { false };
    };
  };

  func isKnownUser(email : Text) : Bool {
    switch (users.get(email)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  func isDistributorByEmail(email : Text) : Bool {
    switch (users.get(email)) {
      case (?user) { switch (user.role) { case (#distributor) { true }; case (_) { false } } };
      case (null) { false };
    };
  };

  func isDeliveryByEmail(email : Text) : Bool {
    switch (users.get(email)) {
      case (?user) { switch (user.role) { case (#delivery) { true }; case (_) { false } } };
      case (null) { false };
    };
  };

  func requireAdminAccess(caller : Principal, sessionEmail : Text) : () {
    if (AccessControl.isAdmin(accessControlState, caller)) { return };
    if (isAdminByEmail(sessionEmail)) { return };
    Runtime.trap("Unauthorized: Only admins can perform this action");
  };

  func requireUserAccess(caller : Principal, sessionEmail : Text) : () {
    if (AccessControl.hasPermission(accessControlState, caller, #user)) { return };
    if (isKnownUser(sessionEmail)) { return };
    Runtime.trap("Unauthorized: Only authenticated users can perform this action");
  };

  func requireDistributorOrAdminAccess(caller : Principal, sessionEmail : Text) : () {
    if (AccessControl.isAdmin(accessControlState, caller)) { return };
    if (isAdminByEmail(sessionEmail)) { return };
    if (AccessControl.hasPermission(accessControlState, caller, #user)) { return };
    if (isDistributorByEmail(sessionEmail)) { return };
    Runtime.trap("Unauthorized: Only authenticated users can perform this action");
  };

  func isAssignedDeliveryUser(order : OrderRecord, caller : Principal, sessionEmail : Text) : Bool {
    switch (order.assignedDeliveryUser) {
      case (?assignedPrincipal) {
        if (assignedPrincipal == caller) { return true };
        if (isDeliveryByEmail(sessionEmail)) { return false };
        false;
      };
      case (null) { false };
    };
  };

  public type CreateOrderInput = {
    orderId : Text;
    storeId : Nat;
    quantity : Nat;
    rate : Float;
    notes : Text;
    timestamp : Int;
    invoicePDF : ?Blob;
  };

  public shared ({ caller }) func createOrder(
    input : CreateOrderInput,
    sessionEmail : Text,
  ) : async () {
    requireUserAccess(caller, sessionEmail);
    if (orders.containsKey(input.orderId)) {
      Runtime.trap("Order ID already exists");
    };
    let newOrder : OrderRecord = {
      orderId = input.orderId;
      storeId = input.storeId;
      quantity = input.quantity;
      rate = input.rate;
      notes = input.notes;
      status = "Pending Approval";
      timestamp = input.timestamp;
      qrCode = null;
      invoicePDF = input.invoicePDF;
      barcodeScan = null;
      loadedTruckImage = null;
      unloadedTruckImage = null;
      gpsLocation = null;
      emptyTruckImage = null;
      assignedDeliveryUser = null;
    };
    orders.add(input.orderId, newOrder);
  };

  public shared ({ caller }) func assignDelivery(
    orderId : Text,
    deliveryUser : Principal,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?order) {
        let updatedOrder : OrderRecord = {
          order with
          assignedDeliveryUser = ?deliveryUser;
          status = "Assigned to Delivery";
          qrCode = ?{
            value = orderId;
            scanned = false;
            scanTimestamp = null;
          };
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getAssignedOrdersForDeliveryUser(
    deliveryUser : Principal,
    sessionEmail : Text,
  ) : async [OrderRecord] {
    let callerIsAdmin = AccessControl.isAdmin(accessControlState, caller) or isAdminByEmail(sessionEmail);
    let callerIsOwner = (caller == deliveryUser);
    if (not callerIsAdmin and not callerIsOwner) {
      Runtime.trap("Unauthorized: Only the delivery user themselves or an admin can view assigned orders");
    };
    let filteredList = List.empty<OrderRecord>();
    for (order in orders.values()) {
      switch (order.assignedDeliveryUser) {
        case (?userId) { if (userId == deliveryUser) { filteredList.add(order) } };
        case (null) {};
      };
    };
    filteredList.toArray();
  };

  public shared ({ caller }) func updateOrderStatusByDeliveryUser(
    orderId : Text,
    newStatus : Text,
    sessionEmail : Text,
  ) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?order) {
        let callerIsAdmin = AccessControl.isAdmin(accessControlState, caller) or isAdminByEmail(sessionEmail);
        let callerIsAssigned = switch (order.assignedDeliveryUser) {
          case (?assignedPrincipal) { assignedPrincipal == caller };
          case (null) { false };
        };
        if (not callerIsAdmin and not callerIsAssigned) {
          Runtime.trap("Unauthorized: Only the assigned delivery user or an admin can update the order status");
        };
        let updatedOrder : OrderRecord = { order with status = newStatus };
        orders.add(orderId, updatedOrder);
      };
    };
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
          let token = email # ":" # roleText # ":" # user.id;
          ?{ role = roleText; token = token };
        } else { null };
      };
      case (null) { null };
    };
  };

  public shared ({ caller }) func addStore(store : Store, sessionEmail : Text) : async () {
    requireAdminAccess(caller, sessionEmail);
    let nextId = stores.size() + 1;
    stores.add(nextId, store);
  };

  public shared ({ caller }) func updateStore(id : Nat, store : Store, sessionEmail : Text) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (stores.get(id)) {
      case (null) { Runtime.trap("Store does not exist") };
      case (?_) { stores.add(id, store) };
    };
  };

  public shared ({ caller }) func deleteStore(id : Nat, sessionEmail : Text) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (stores.get(id)) {
      case (null) { Runtime.trap("Store does not exist") };
      case (?_) { stores.remove(id) };
    };
  };

  public query ({ caller }) func getAllStores(sessionEmail : Text) : async [Store] {
    requireUserAccess(caller, sessionEmail);
    stores.values().toArray();
  };

  public shared ({ caller }) func updateOrder(
    orderId : Text,
    updatedOrder : OrderRecord,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?_) { orders.add(orderId, updatedOrder) };
    };
  };

  public query ({ caller }) func getOrder(orderId : Text, sessionEmail : Text) : async ?OrderRecord {
    requireUserAccess(caller, sessionEmail);
    orders.get(orderId);
  };

  public query ({ caller }) func getAllOrders(sessionEmail : Text) : async [OrderRecord] {
    requireUserAccess(caller, sessionEmail);
    orders.values().toArray();
  };

  public query ({ caller }) func getAllUsers(sessionEmail : Text) : async [User] {
    requireAdminAccess(caller, sessionEmail);
    users.values().toArray();
  };

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
      case (?_) { users.add(email, updatedUser) };
    };
  };

  public shared ({ caller }) func deleteUser(email : Text, sessionEmail : Text) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (users.get(email)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?_) { users.remove(email) };
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
    let callerIsAdmin = AccessControl.isAdmin(accessControlState, caller) or isAdminByEmail(sessionEmail);
    switch (distributorDeliveries.get(deliveryId)) {
      case (null) { Runtime.trap("Distributor delivery does not exist") };
      case (?existing) {
        let callerIsAssignedDistributor = (caller == existing.distributor) or (isDistributorByEmail(sessionEmail) and sessionEmail == existing.driverName);
        if (not callerIsAdmin and not callerIsAssignedDistributor) {
          Runtime.trap("Unauthorized: Only admins or the assigned distributor can update this delivery");
        };
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
      case (?_) { distributorDeliveries.remove(deliveryId) };
    };
  };

  public query ({ caller }) func getAllDistributorDeliveries(
    sessionEmail : Text,
  ) : async [DistributorDelivery] {
    requireAdminAccess(caller, sessionEmail);
    distributorDeliveries.values().toArray();
  };

  public query ({ caller }) func getDistributorDeliveriesByUser(
    distributor : Principal,
    sessionEmail : Text,
  ) : async [DistributorDelivery] {
    let callerIsAdmin = AccessControl.isAdmin(accessControlState, caller) or isAdminByEmail(sessionEmail);
    let callerIsOwner = caller == distributor;
    let sessionIsDistributor = isDistributorByEmail(sessionEmail);
    if (not callerIsAdmin and not callerIsOwner and not sessionIsDistributor) {
      Runtime.trap("Unauthorized: Can only view your own deliveries");
    };
    let filteredList = List.empty<DistributorDelivery>();
    for (delivery in distributorDeliveries.values()) {
      if (delivery.distributor == distributor) { filteredList.add(delivery) };
    };
    filteredList.toArray();
  };

  public query ({ caller }) func getDistributorDelivery(
    deliveryId : Text,
    sessionEmail : Text,
  ) : async ?DistributorDelivery {
    let callerIsAdmin = AccessControl.isAdmin(accessControlState, caller) or isAdminByEmail(sessionEmail);
    if (not callerIsAdmin) {
      switch (distributorDeliveries.get(deliveryId)) {
        case (null) { Runtime.trap("Unauthorized: Only admins or the assigned distributor can view this delivery") };
        case (?delivery) {
          let callerIsAssignedDistributor = (caller == delivery.distributor) or isDistributorByEmail(sessionEmail);
          if (not callerIsAssignedDistributor) {
            Runtime.trap("Unauthorized: Only admins or the assigned distributor can view this delivery");
          };
          return ?delivery;
        };
      };
    };
    distributorDeliveries.get(deliveryId);
  };

  public shared ({ caller }) func approveOrder(
    orderId : Text,
    newStatus : Text,
    sessionEmail : Text,
  ) : async () {
    requireAdminAccess(caller, sessionEmail);
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?existingOrder) {
        let updatedOrder : OrderRecord = {
          existingOrder with
          status = newStatus;
          qrCode = shouldGenerateQRCode(existingOrder, newStatus);
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  func shouldGenerateQRCode(order : OrderRecord, newStatus : Text) : ?QRCodeData {
    switch (order.qrCode) {
      case (?existingQRCode) { ?existingQRCode };
      case (null) {
        if (newStatus == "Assigned to Delivery") {
          ?{
            value = order.orderId;
            scanned = false;
            scanTimestamp = null;
          };
        } else { null };
      };
    };
  };

  public query ({ caller }) func getAdminDashboardStats(
    sessionEmail : Text,
  ) : async {
    totalOrdersToday : Nat;
    activeDeliveries : Nat;
    trucksInTransit : Nat;
    deliveredToday : Nat;
    pendingApproval : Nat;
    confirmationsPending : Nat;
  } {
    requireAdminAccess(caller, sessionEmail);

    let currentTime = Time.now();
    let midnight = currentTime - (currentTime % 86400000000000);

    var totalOrdersToday = 0;
    var activeDeliveries = 0;
    var trucksInTransit = 0;
    var deliveredToday = 0;
    var pendingApproval = 0;
    var confirmationsPending = 0;

    for (order in orders.values()) {
      if (order.timestamp > midnight) {
        totalOrdersToday += 1;
        if (order.status == "Delivered") { deliveredToday += 1 };
      };

      if (order.status == "Out for Delivery") { activeDeliveries += 1 };
      if (order.status == "Trucks in Transit") { trucksInTransit += 1 };
      if (order.status == "Pending Approval") { pendingApproval += 1 };
      if (order.status == "Distributor Confirmations Pending") { confirmationsPending += 1 };
    };

    {
      totalOrdersToday;
      activeDeliveries;
      trucksInTransit;
      deliveredToday;
      pendingApproval;
      confirmationsPending;
    };
  };

  public query ({ caller }) func getDeliveryVerificationRecords(
    sessionEmail : Text,
  ) : async [{
    orderId : Text;
    storeName : Text;
    distributor : Principal;
    truckNumber : Text;
    driverName : Text;
    timestamp : Int;
    loadedTruckImage : ?Blob;
    unloadedTruckImage : ?Blob;
    emptyTruckImage : ?Storage.ExternalBlob;
    storeRecord : ?Store;
    orderContents : {
      quantity : Nat;
      rate : Float;
      notes : Text;
    };
  }] {
    requireAdminAccess(caller, sessionEmail);
    let recordsList = List.empty<{
      orderId : Text;
      storeName : Text;
      distributor : Principal;
      truckNumber : Text;
      driverName : Text;
      timestamp : Int;
      loadedTruckImage : ?Blob;
      unloadedTruckImage : ?Blob;
      emptyTruckImage : ?Storage.ExternalBlob;
      storeRecord : ?Store;
      orderContents : {
        quantity : Nat;
        rate : Float;
        notes : Text;
      };
    }>();

    for (order in orders.values()) {
      switch (order.status) {
        case ("Delivered") {
          let matchingDelivery = distributorDeliveries.values().find(func(d) { d.orderId == order.orderId });
          switch (matchingDelivery) {
            case (?delivery) {
              let storeRecord = stores.get(order.storeId);
              let record = {
                orderId = order.orderId;
                storeName = order.orderId;
                distributor = delivery.distributor;
                truckNumber = delivery.truckNumber;
                driverName = delivery.driverName;
                timestamp = order.timestamp;
                loadedTruckImage = order.loadedTruckImage;
                unloadedTruckImage = order.unloadedTruckImage;
                emptyTruckImage = order.emptyTruckImage;
                storeRecord;
                orderContents = {
                  quantity = order.quantity;
                  rate = order.rate;
                  notes = order.notes;
                };
              };
              recordsList.add(record);
            };
            case (null) {};
          };
        };
        case (_) {};
      };
    };

    recordsList.toArray();
  };

  public shared ({ caller }) func submitDistributorConfirmation(
    orderId : Text,
    barcodeScan : Text,
    loadedTruckImage : Blob,
    unloadedTruckImage : Blob,
    sessionEmail : Text,
  ) : async () {
    requireDistributorOrAdminAccess(caller, sessionEmail);

    let order = switch (orders.get(orderId)) {
      case (?o) { o };
      case (null) { Runtime.trap("Order not found. Cannot submit distributor confirmation.") };
    };

    if (order.status != "Distributor Confirmations Pending") {
      Runtime.trap("Order is not in the correct workflow stage for distributor confirmations.");
    };

    let callerIsAdmin = AccessControl.isAdmin(accessControlState, caller) or isAdminByEmail(sessionEmail);
    if (not callerIsAdmin) {
      let matchingDelivery = distributorDeliveries.values().find(func(d) { d.orderId == orderId });
      switch (matchingDelivery) {
        case (?delivery) {
          let callerIsAssignedDistributor = (caller == delivery.distributor) or isDistributorByEmail(sessionEmail);
          if (not callerIsAssignedDistributor) {
            Runtime.trap("Unauthorized: Only the assigned distributor or an admin can submit confirmation for this order");
          };
        };
        case (null) {
          if (not isDistributorByEmail(sessionEmail)) {
            Runtime.trap("Unauthorized: Only the assigned distributor or an admin can submit confirmation for this order");
          };
        };
      };
    };

    let updatedOrder : OrderRecord = {
      order with
      barcodeScan = ?barcodeScan;
      loadedTruckImage = ?loadedTruckImage;
      unloadedTruckImage = ?unloadedTruckImage;
      status = "Delivered";
    };

    orders.add(orderId, updatedOrder);
  };

  public shared ({ caller }) func updateOrderStatusUsingQR(
    orderId : Text,
    qrCodeValue : Text,
    sessionEmail : Text,
  ) : async () {
    requireUserAccess(caller, sessionEmail);

    let order = switch (orders.get(orderId)) {
      case (?o) { o };
      case (null) { Runtime.trap("Order not found. Cannot update order status using QR.") };
    };

    switch (order.qrCode) {
      case (?qr) {
        if (qr.value != qrCodeValue) {
          Runtime.trap("Invalid QR code value provided. Status update failed.");
        };
      };
      case (null) {
        Runtime.trap("Order does not have a valid QR code. Status update failed.");
      };
    };

    let nextStatus = switch (order.status) {
      case ("Approved") { "Ready" };
      case ("Ready") { "Dispatched" };
      case ("Dispatched") { "Out for Delivery" };
      case ("Out for Delivery") { "Trucks in Transit" };
      case ("Trucks in Transit") { "Distributor Confirmations Pending" };
      case ("Distributor Confirmations Pending") { "Delivered" };
      case ("Delivered") { Runtime.trap("Order is already delivered and locked. No further transitions allowed.") };
      case ("Locked") { Runtime.trap("Order is permanently locked. No further transitions allowed.") };
      case (_) { Runtime.trap("Invalid workflow state. Cannot transition order further.") };
    };

    let updatedOrder : OrderRecord = { order with status = nextStatus };
    orders.add(orderId, updatedOrder);
  };

  public query ({ caller }) func getOrderWorkflowStatus(
    orderId : Text,
    sessionEmail : Text,
  ) : async Text {
    requireUserAccess(caller, sessionEmail);
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order ID does not exist. Cannot fetch status.") };
      case (?order) { order.status };
    };
  };

  public query ({ caller }) func filterOrdersByStatus(
    status : Text,
    sessionEmail : Text,
  ) : async [OrderRecord] {
    requireUserAccess(caller, sessionEmail);
    orders.values().toArray().filter(func(_order) { _order.status == status });
  };

  public query ({ caller }) func getOrderWithImages(orderId : Text, sessionEmail : Text) : async ?OrderRecord {
    requireUserAccess(caller, sessionEmail);
    orders.get(orderId);
  };

  public shared ({ caller }) func addGpsLocation(
    orderId : Text,
    latitude : Float,
    longitude : Float,
    sessionEmail : Text,
  ) : async () {
    requireUserAccess(caller, sessionEmail);

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?order) {
        let updatedOrder : OrderRecord = {
          order with gpsLocation = ?{ latitude; longitude; timestamp = Time.now() };
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getLiveTrackingData(
    sessionEmail : Text,
  ) : async [{
    orderId : Text;
    status : Text;
    location : ?GpsLocation;
  }] {
    requireAdminAccess(caller, sessionEmail);

    let currentTime = Time.now();
    let trackingWindow : Int = 86400000000;

    let recentOrders = orders.values().toArray().filter(
      func(order) {
        if (order.timestamp > currentTime) { false } else {
          switch (order.gpsLocation) {
            case (null) { false };
            case (?loc) { (currentTime - order.timestamp) <= trackingWindow };
          };
        };
      }
    );

    recentOrders.map(func(order) { { orderId = order.orderId; status = order.status; location = order.gpsLocation } });
  };

  public shared ({ caller }) func addEmptyTruckImage(
    orderId : Text,
    file : Storage.ExternalBlob,
    sessionEmail : Text,
  ) : async () {
    requireUserAccess(caller, sessionEmail);

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?order) {
        let updatedOrder : OrderRecord = { order with emptyTruckImage = ?file };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getEmptyTruckImage(
    orderId : Text,
    sessionEmail : Text,
  ) : async ?Storage.ExternalBlob {
    requireAdminAccess(caller, sessionEmail);
    switch (orders.get(orderId)) {
      case (null) { null };
      case (?order) { order.emptyTruckImage };
    };
  };
};
