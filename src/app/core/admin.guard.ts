import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { UserState } from '../modules/shared/domaine/state/auth/user-state.reducer';
import { UserSessionState } from '../modules/shared/domaine/state/auth/user-session-state.reducer';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthGuard implements CanActivate {

  constructor(
    private store: Store,
    private router: Router
  ) { }

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {

          // User is logged in, now check their role
          const currentUser = this.store.selectSnapshot(UserSessionState.getUser);  // Assuming this gets the user from your store
          if (currentUser && currentUser.app_role === 'admin') {
            return true;  // User is an admin
          } else {
            this.router.navigate(['/']);  // Redirect to not-authorized page
            return false;
          }

  
  }
}
