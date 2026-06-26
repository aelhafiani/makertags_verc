import { ISessionUserModel, IUserModel } from "../../entities/user";
import { UserStateModel } from "./user-state.model";

export class SetUser {
    static readonly type = '[User] Set';
    constructor(public payload: IUserModel) {}
  }
  
  export class UpdateUserRole {
    static readonly type = '[User] Update Role';
    constructor(public role: string) {}
  }
  
  // user-state.action.ts
export class Logout {
  static readonly type = '[User] Logout';
}

export class SetUserSession {
    static readonly type = '[UserSession] Set';
    constructor(public payload: ISessionUserModel) {}
}