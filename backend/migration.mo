import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type OldUser = {
    email : Text;
    hashedPassword : Text;
    role : {
      #admin;
      #staff;
      #delivery;
      #distributor;
    };
  };

  type OldActor = {
    users : Map.Map<Text, OldUser>;
  };

  type NewUser = {
    id : Text;
    email : Text;
    hashedPassword : Text;
    role : {
      #admin;
      #staff;
      #delivery;
      #distributor;
    };
  };

  type NewActor = {
    users : Map.Map<Text, NewUser>;
    userIdCounter : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newUsers = old.users.map<Text, OldUser, NewUser>(
      func(_email, oldUser) {
        { oldUser with id = oldUser.email };
      }
    );
    { users = newUsers; userIdCounter = 0 };
  };
};
