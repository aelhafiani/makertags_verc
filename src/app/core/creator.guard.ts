import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class CreatorGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
