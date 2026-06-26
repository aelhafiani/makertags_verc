import { State, Action, StateContext, Selector } from '@ngxs/store';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Logout,  SetUserSession } from './user-state.action';
import { ISessionUserModel } from '../../entities/user';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

const initialState = {
access_token: '',
expires_at: 0,
expires_in: 0,
refresh_token: '',
user: {
  id: '',
  email: '',
  createdAt: '',
  lastLoginAt: '',
  emailVerified: false,
  app_role: 'user'
}

}

@State<ISessionUserModel>({
  name: 'UserSessionState',
  defaults: initialState
})
@Injectable()
export class UserSessionState {
  constructor( private router: Router) {}

   @Selector()
   static getSessionToken(state: ISessionUserModel) {
     return state.access_token;
    }

    @Selector()
    static getUser(state: ISessionUserModel) {
      return state.user;
     
    }
        @Selector()
    static getUserSession(state: ISessionUserModel) {
      return state;
     
    }
    @Selector()
    static getIsUserLoggedIn(state: ISessionUserModel) {
      return !!state.access_token;  
    }

    @Selector()
    static getIsUserAdmin(state: ISessionUserModel) {
      const role = state.user.app_role ?? '';
      return role === 'admin' || role.includes('admin');
     }

  // Action to set the user object
  @Action(SetUserSession)
  setUserSession(ctx: StateContext<ISessionUserModel>, action: SetUserSession) {
    const state = ctx.getState();
    ctx.setState({
      ...state,
      ...action.payload
    });
  }


  @Action(Logout)
  logout(ctx: StateContext<ISessionUserModel>) {
    const platformId = inject(PLATFORM_ID);

    ctx.setState(initialState);
    this.router.navigate(['/']);
   

  }



}
