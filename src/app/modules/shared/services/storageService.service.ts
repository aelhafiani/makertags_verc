import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Store } from '@ngxs/store';
import { ResetStore } from '../domaine/state/art-doc/art-doc.actions';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    constructor(private store: Store,@Inject(PLATFORM_ID) private platformId: Object) {}

  clearStorage(): void {
   if (isPlatformBrowser(this.platformId)) {
        localStorage.clear();
   }
  
  }

  clearAll(): void {
    // Resetar o estado do NGXS
    this.store.dispatch(new ResetStore());

    // Limpar o armazenamento usando ngx-pwa/local-storage
    this.clearStorage()
}
}