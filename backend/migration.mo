import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type User = {
    email : Text;
    hashedPassword : Text;
    role : UserRole;
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

  type OrderRecord = {
    orderId : Text;
    storeId : Nat;
    quantity : Nat;
    rate : Float;
    notes : Text;
    status : Text;
    timestamp : Int;
  };

  type OldActor = {
    users : Map.Map<Text, User>;
    userProfiles : Map.Map<Principal, UserProfile>;
    stores : Map.Map<Nat, Store>;
    orders : Map.Map<Text, OrderRecord>;
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

  type NewActor = {
    users : Map.Map<Text, User>;
    userProfiles : Map.Map<Principal, UserProfile>;
    stores : Map.Map<Nat, Store>;
    orders : Map.Map<Text, OrderRecord>;
    distributorDeliveries : Map.Map<Text, DistributorDelivery>;
  };

  public func run(old : OldActor) : NewActor {
    let distributorDeliveries = Map.empty<Text, DistributorDelivery>();
    { old with distributorDeliveries };
  };
};
