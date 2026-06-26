import { computed, Inject, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { NzMessageService } from 'ng-zorro-antd/message';
import { BehaviorSubject,   Observable } from 'rxjs';
import { Logout, SetUser, SetUserSession, UpdateUserRole } from '../domaine/state/auth/user-state.action';
import { UserState } from '../domaine/state/auth/user-state.reducer';
import { ActivatedRoute, Router } from '@angular/router';
import { ISessionUserModel, IUserModel } from '../domaine/entities/user';

import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { ENVIRONMENTS } from '../../../core/app.tokens';
import { UserStateModel } from '../domaine/state/auth/user-state.model';
import { OtpLoginComponent } from '../../auth/otp-login/otp-login.component';
import { UserSessionState } from '../domaine/state/auth/user-session-state.reducer';
import { SupabaseService } from './supabase.service';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid
import { GuestLoaderService } from './guest.loader.service';


export interface IUser  {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isAdmin$: Observable<boolean>;
  user$: Observable<UserStateModel>;
  // firestore = inject(Firestore);
 private modalRef?: NzModalRef; 
  modal = inject(NzModalService);
  nzMessageService = inject(NzMessageService);
  store = inject(Store);
  supabaseService = inject(SupabaseService);
  // userCollection = collection(this.firestore, 'users');
  envirenement = inject(ENVIRONMENTS);
  user: IUser | null = null;
  existedOtp: string = '';
    private _accessToken = signal<string | null>(this.getAccessToken());

  isLoggedIn = computed(() => !!this._accessToken());

  // isLoggedIn$ = this._isLoggedIn$.asObservable();
  get userCollection() {
    return null
  }

  private otpSended = new BehaviorSubject<boolean>(false);
  private apiUrlDisabledUser = '/.netlify/functions/disabledUser';
  private apiUrlEnableUser = '/.netlify/functions/enableUser';
  private apiUrlGenerateCustomToken = `/.netlify/functions/generateCustomToken`



  constructor(@Inject(PLATFORM_ID) private platformId: Object, 
  // private afAuth: AngularFireAuth,
  private http :HttpClient,
  private router: Router,
  private guestLoader: GuestLoaderService

  // private messaging: Messaging,private afMessaging: AngularFireMessaging
) {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.getAccessToken();
      this._accessToken.set(token);
    }
    // this.isLoggedIn$ = this.store.select(UserSessionState.getIsUserLoggedIn);
    this.isAdmin$ = this.store.select(UserSessionState.getIsUserAdmin);
    this.user$ = this.store.select(UserSessionState.getUser);
   
    // this.afAuth.authState.subscribe(user => {
    //   this.user = user as any;
    // });
  }
  // private hasAccessToken(): boolean {
  //   return !!this.accessToken;
  // }
  // you can also add convenience methods:

  async isLoggedInAsync(): Promise<boolean> {
  const { data } = await this.supabaseService.client.auth.getSession();
  const session = data?.session;
  return !!session?.access_token;
}
  getUserSnapshot(): IUserModel {
    return this.store.selectSnapshot(UserState.getUser);
  }
  // updateLoginState() {
  //   this._isLoggedIn$.next(this.hasAccessToken());
  // }
   private getAccessToken(): string | null {
     
    try {
      if (isPlatformBrowser(this.platformId)) {
      const rawState = localStorage.getItem('UserSessionState');
      if (!rawState) return null;
      // this.updateLoginState();
      const parsed = JSON.parse(rawState);
      return parsed?.access_token ?? null;
      }else{
        return null;
      }
    } catch {
      return null;
    }
  
   
  }

  async getUser(): Promise<IUserModel | null> {
    const { data } = await this.supabaseService.client.auth.getUser();
    return data.user;
  }
  async signInAsGuest() {
    const { data, error } = await this.supabaseService.client.auth.signInAnonymously();
    if (error) throw error;
    return data;
  }
    getCurrentUserSession(): ISessionUserModel {
      return this.store.selectSnapshot(UserSessionState.getUserSession);
    }
  async storeUserSession() {
     const userSession = (await this.supabaseService.client.auth.getSession()).data.session;
     
    let sessionToStore = {} as ISessionUserModel;
    if(userSession === null) return;
    const UserFromCollection = await this.getUserById(userSession.user.id);
    sessionToStore = {
      access_token: userSession.access_token,
      expires_at: userSession.expires_at,
      expires_in: userSession.expires_in,
      refresh_token: userSession.refresh_token,
      user: {
        id: userSession.user.id,
        email: userSession.user.email,
        createdAt: userSession.user.created_at,
        lastLoginAt: userSession.user.last_sign_in_at,
        emailVerified: userSession.user.user_metadata['email_verified'],
        app_role: UserFromCollection?.app_role || 'guest-user',
        photoURL: userSession.user.user_metadata['avatar_url'] || userSession.user.user_metadata['picture'] || 'https://www.gravatar.com/avatar/placeholder?d=mp&f=y', 
      }
    }
    this.store.dispatch(new SetUserSession(sessionToStore));
    this._accessToken.set(sessionToStore.access_token);
          // Update user role
      // Redirect to the previous path or home if not available
       if (isPlatformBrowser(this.platformId)) {
      const previousPath = window?.location?.pathname || '/';
      this.router.navigate([previousPath]);
       }
  }

 
  // }  
   handleLoginError(error: any): void {
    // Customize error message based on error code
    let errorMessage = error.message;

    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'No user found with this email.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format. Please check and try again.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many login attempts. Please wait and try again later.';
    }

    // Display the error message using NzMessageService
    this.nzMessageService.error(errorMessage);
  }
  openLoginModal(): Observable<boolean> {
  this.modalRef?.destroy();

  return new Observable<boolean>(observer => {
    this.modalRef = this.modal.create({
      nzContent: OtpLoginComponent,

      nzOnOk: () => {
        observer.next(true);  // logged in
        observer.complete();
      },
      nzOnCancel: () => {
        observer.next(false); // cancelled
        observer.complete();
      }
    });
  });
}


async waitForSession(timeoutMs = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;

    const timer = setTimeout(() => {
      if (!done) reject(new Error('Session not ready after timeout'));
    }, timeoutMs);

    const { data: listener } = this.supabaseService.client.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          clearTimeout(timer);
          done = true;
          listener?.subscription.unsubscribe();
          resolve();
        }
      }
    );
  });
}
async logout() {
  try {
    const { error } = await this.supabaseService.client.auth.signOut();

    if (error) throw error;
    this._accessToken.set(null);
    this.store.dispatch(new Logout());
  } catch (error) {
    console.error("Error during logout:", error);
  }
}



async getUserById(userId: string):Promise<any> {
  const { data, error } = await this.supabaseService.client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

  isLoogedIn(): boolean {
    return this.user !== null;
  }


  getCurrentUser() {
    return this.user;
  }
  
  disabledUSer(userId: string) {
    return this.http.post(this.apiUrlDisabledUser, {uid: userId});
    }
  enableUser(userId: string) {
    return this.http.post(this.apiUrlEnableUser, {uid: userId});
  }
  generateCustomToken(userId: string) {
    return this.http.post(this.apiUrlGenerateCustomToken, {uid: userId});
  }


  async checkOrCreateUserAndStoreSession(user?: any): Promise<void> {
  try {
    // 1️⃣ Récupère la session locale si existante
      this.guestLoader.show('Création de votre session invité...');

    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    const currentUser = sessionData?.session?.user;

    // 2️⃣ Détermine le user final (priorité : paramètre → session → anonyme)
    let finalUser = user || currentUser;

    if (!finalUser) {
      const { data, error } = await this.supabaseService.client.auth.signInAnonymously();
      if (error) throw error;
      finalUser = data.user;
      await this.waitForSession();
    }

    if (!finalUser) throw new Error('Failed to obtain Supabase user');

    // 3️⃣ Vérifie l’existence dans la table profiles
    const { data: userInDB, error: profileError } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', finalUser.id)
      .maybeSingle(); // ✅ meilleur que .single(), ne lance pas d’erreur si rien trouvé

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user from DB:', profileError);
      throw profileError;
    }

    // 4️⃣ Crée un profil si inexistant
    if (!userInDB) {
      const shortId = (finalUser.id || '').split('-')[0] || Math.random().toString(36).substring(2, 6);

      const newProfile = {
        id: finalUser.id,
        email: finalUser.email || `anonymous-${shortId}@anonymous.com`,
        full_name: finalUser.user_metadata?.['full_name'] || `Anonymous-${shortId}`,
        app_role: 'anonymous-user',
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await this.supabaseService.client
        .from('profiles')
        .insert([newProfile]);

      if (insertError) throw insertError;
    }

    // 5️⃣ Stocke la session localement (ou dans ton state manager)
    await this.storeUserSession();

  } catch (err) {
    console.error('❌ checkOrCreateUserAndStoreSession failed:', err);
    throw err; // ⬅️ important : propager l’erreur pour que le resolver l’attende
  }
  finally {
       this.guestLoader.hide();
    }
}


}
