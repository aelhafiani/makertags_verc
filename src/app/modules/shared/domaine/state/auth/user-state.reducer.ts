import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { Logout, SetUser, UpdateUserRole } from './user-state.action';
import { UserStateModel } from './user-state.model';

const initialState = {
  id: '',
  email: '',
  createdAt: '',
  lastLoginAt: '',
  emailVerified: false,
  app_role: "user" ,
  session: null,
}

@State<UserStateModel>({
  name: 'UserState',
  defaults: initialState
})
@Injectable()
export class UserState {

  // Selector to get the user state
  @Selector()
  static getUser(state: UserStateModel) {
    return state;
  }


  // Selector to get the user role
  @Selector()
  static getUserRole(state: UserStateModel) {
    return state.app_role;
  }
   // Selector to check if the user is logged in
   @Selector()
   static getIsUserLoggedIn(state: UserStateModel) {
     return state.role === 'authenticated';  
   }

   @Selector()
   static getIsUserAdmin(state: UserStateModel) {
     const role = state.app_role ?? '';
     return role === 'admin' || role.includes('admin');
    }

  // Action to set the user object
  @Action(SetUser)
  setUser(ctx: StateContext<UserStateModel>, action: SetUser) {
    const state = ctx.getState();
    ctx.setState({
      ...state,
      ...action.payload
    });
  }

  // Action to update the user role
  @Action(UpdateUserRole)
  updateUserRole(ctx: StateContext<UserStateModel>, action: UpdateUserRole) {
    const state = ctx.getState();
    ctx.patchState({
      app_role: action.role
    });
  }

  @Action(Logout)
  logout(ctx: StateContext<UserStateModel>) {
    ctx.setState(initialState);
  }
}
