import { Component, inject, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CoreModule } from './core/core.module';
import { MetaService } from './modules/shared/services/meta.service';
import { SupabaseService } from './modules/shared/services/supabase.service';
import { AuthService } from './modules/shared/services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  standalone: true,
  imports: [RouterModule, CoreModule],
  selector: 'maker-tags-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'maker-tags';
  metaService = inject(MetaService);
  supabase = inject(SupabaseService);
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  transloco = inject(TranslocoService);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('lang');
      if (saved && ['en', 'es', 'de'].includes(saved)) {
        this.transloco.setActiveLang(saved);
      }
    }
  }

  async ngOnInit() {
    console.log('AppComponent initialized');

    // Handle access_token from email link (post-purchase)
    if (isPlatformBrowser(this.platformId)) {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('access_token');

      console.log('[AppComponent] URL search params:', window.location.search);
      console.log('[AppComponent] Token found:', !!token);

      if (token) {
        try {
          console.log('[AppComponent] Found access_token in URL, signing in...');
          console.log('[AppComponent] Token:', token.substring(0, 20) + '...');

          // Set the session with the token
          const { error } = await this.supabase.client.auth.setSession({
            access_token: token,
            refresh_token: '', // Not needed for access link
          });

          if (error) {
            console.error('[AppComponent] Error setting session:', error);
            return;
          }

          console.log('[AppComponent] Session set successfully');

          // Store user session
          await this.auth.storeUserSession();
          console.log('[AppComponent] User session stored');

          // Remove token from URL and redirect to profile
          window.history.replaceState({}, document.title, window.location.pathname);
          this.router.navigate(['/profile']);
          console.log('[AppComponent] User authenticated via access token and redirected to profile');
        } catch (err) {
          console.error('[AppComponent] Error in token flow:', err);
        }
      } else {
        console.log('[AppComponent] No access_token in URL');
      }
    }
  }
}
