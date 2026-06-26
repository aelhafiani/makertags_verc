import { inject, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../../../supabase-client';
import { ENVIRONMENTS } from '../../../core/app.tokens';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;
    environment = inject(ENVIRONMENTS);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // this.loadUser();
    this.supabase = supabase
  }
get client() {
    return this.supabase;
  }
 private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  // Sign in with Google
  async signInWithGoogle() {
  // Default to your site URL for SSR
  const redirectTo = `${this.environment.appUrl}/auth/google-login-callback`
  console.log('redirectTo', redirectTo)
  const { data, error } = await this.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }

  console.log('Google sign-in initiated:', data);
  return data;
}


  async isCompleteRegistration(email: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

 async checkHasPassword(email: string): Promise<boolean> {
  const { data, error } = await this.supabase
    .from('profiles')
    .select('has_password')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false; // default to OTP flow
  }
  return data?.has_password === true;
}

  // Get current session
  async getSession() {
    return await this.supabase.auth.getSession();
  }

  // Sign out
  async signOut() {
    return await this.supabase.auth.signOut();
  }

 async signInWithOtp(email: string) {
  return await this.supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: undefined },
  });
}

async completeProfile(userId: string, full_name: string, password: string) {
  // 1. Update password
const { error: updateError } = await this.supabase.auth.updateUser({
  password,
  data: {
    has_password: true,
    full_name
  }
});  if (updateError) throw updateError;

  // 2. Update profile
  const { error: upsertError } = await this.supabase
    .from('profiles')
    .upsert([
      {
        id: userId,            
        full_name,
        has_password: true,
        updated_at: new Date().toISOString(),
      }
    ]);

  if (upsertError) throw upsertError;

  // ✅ Return a clear response
  return { success: true };
}

  async addUserToSupabase(userId: string, email: string, fullName: string, role: string) {
    // Check if profile already exists
    const { data: existing } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // If already exists, just return
    if (existing) return existing;

    // Otherwise, create it
    const { data, error } = await this.supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: email,
          app_role: role,
          has_password: false,
          full_name: fullName,
          created_at: new Date().toISOString()
        }
      ]);
    if (error) throw error;
    return data;
  }
   async sendOtp(email: string) {
    return await this.supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: undefined },
    });
  }


  async verifyOtp(email: string, token: string) {
    return await this.supabase.auth.verifyOtp({
      email,
      token,
      type: 'email', // 👈 important for email OTP
    });
  }

  signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

   async loadUser() {
    const { data } = await this.supabase.auth.getUser();
    this.userSubject.next(data.user);
  }

  async isLoggedIn(): Promise<boolean> {
    const { data } = await this.supabase.auth.getUser();
    return !!data.user;
  }

  async isEmailVerified(): Promise<boolean> {
    const { data } = await this.supabase.auth.getUser();
    return !!data.user?.email_confirmed_at;
  }

  
}
