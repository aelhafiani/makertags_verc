import { inject, Injectable } from '@angular/core';
import { CanActivate,  ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Select, Store } from '@ngxs/store';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../modules/shared/services/auth.service';
import { UserSessionState } from '../modules/shared/domaine/state/auth/user-session-state.reducer';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { OtpLoginComponent } from '../modules/auth/otp-login/otp-login.component';
import { SupabaseService } from '../modules/shared/services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  private supabase = inject(SupabaseService);

  constructor(private authService:AuthService,private store: Store, private router: Router, private modal: NzModalService) {
    // Initialize the isLoggedIn$ observable
  }


  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    // Allow direct access via JWT token sent in purchase confirmation emails
    const accessToken = route.queryParams['access_token'];
    if (accessToken) {
      try {
        const { data, error } = await this.supabase.client.auth.setSession({
          access_token: accessToken,
          refresh_token: accessToken, // no real refresh token; session valid for 1 h
        });
        if (!error && data.session) {
          return true; // profile ngOnInit will persist the session to the NGXS store
        }
        console.warn('[AuthGuard] access_token session failed:', error?.message);
      } catch (e) {
        console.warn('[AuthGuard] access_token exception:', e);
      }
    }

    const isAuthenticated = this.authService.isLoggedIn;
    if (isAuthenticated()) {
      return true;
    } else {
      this.openLoginModal();
      return false;
    }
  }

  openLoginModal() {
     this.modal.create({
      nzContent: OtpLoginComponent,
      nzMaskClosable: false,
      nzFooter: null,
    });
  }
}
