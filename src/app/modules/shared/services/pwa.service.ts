// install-pwa.service.ts or in app.component.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferredPrompt: any;

  constructor() {
    // window.addEventListener('beforeinstallprompt', (e) => {
    //   // Prevent the mini-infobar from appearing
    //   e.preventDefault();
    //   this.deferredPrompt = e;
    // });
  }

  get installPromptEvent() {
    return this.deferredPrompt;
  }

  
}
