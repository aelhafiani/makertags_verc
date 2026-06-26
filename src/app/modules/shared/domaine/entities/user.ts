export interface IUserModel {
    id: string;
    email?: string ;
    createdAt?: Date | string;
    lastLoginAt?:  Date | string;
    emailVerified?: boolean;
    app_role?: 'guest-user' | 'admin' | 'moderator' | string;
    photoURL?: string;
    fullName?: string;
    role?: string;
    
  }
  
  export interface ISessionUserModel {
    access_token:string,
    expires_at?: number ,
    expires_in?: number ,
    refresh_token:string,
    user: IUserModel 
  }
  export interface ProviderData {
    providerId: string;
    uid: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
  }
  
  export interface TokenManager {
    refreshToken: string;
    accessToken: string;
    expirationTime: number;
  }
  
  export interface Timestamp {
    seconds: number;
    nanoseconds: number;
  }
  
