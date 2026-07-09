import { Component, inject } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../shared/services/supabase.service';

@Component({
    selector: 'app-google-login-callback',
    template: `
        <div class="google-login-callback">
            <p>Processing Google login callback...</p>
        </div>
    `,
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export class GoogleLoginCallbackComponent {
  private supabaseService = inject(SupabaseService);
     constructor(
    private router: Router,
    private authService: AuthService,
    
  ) {}

  async ngOnInit() {
   const { data: { user } } = await this.supabaseService.client.auth.getUser()
       if (!user) {
      this.router.navigateByUrl('/login');
      return;
    }

    // Check user in DB
    const { data: userInDB, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(error);
      return;
    }
    if (!userInDB) {
      await this.supabaseService.client.from('profiles').insert([{
        id: user.id,
        email: user.email,
        full_name: user.user_metadata['full_name'] || '',
        app_role: 'guest-user',
        created_at: new Date().toISOString(),
      }]);
    }
    await this.authService.storeUserSession();

    // Redirect to home/dashboard
     const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/';
     localStorage.removeItem('redirectAfterLogin');
     this.router.navigateByUrl(redirectUrl);
  }
}