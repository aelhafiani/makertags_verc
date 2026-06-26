import { Injectable } from "@angular/core";
import { Resolve } from "@angular/router";
import { AuthService } from "../modules/shared/services/auth.service";

@Injectable({ providedIn: 'root' })
export class GuestAuthResolver implements Resolve<any> {
  constructor(private authService: AuthService) {}

  async resolve(): Promise<boolean> {
    const isAuth = await this.authService.isLoggedInAsync();
    if (!isAuth) {
      await this.authService.checkOrCreateUserAndStoreSession();
    }
    return true;
  }
}