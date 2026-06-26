import { Component, Inject, PLATFORM_ID, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedUiComponentsModule } from '../../shared/shared-ui-components.module';
import { AuthService } from '../../shared/services/auth.service';
import { ISessionUserModel, IUserModel } from '../../shared/domaine/entities/user';
import { UserArtDoc, UserArtDocsService } from '../../shared/services/users_art_docs.service';
import { IArtDoc } from '../../shared/domaine/entities/art';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { SupabaseService } from '../../shared/services/supabase.service';
import { PaymentService, PlanId } from '../../shared/services/payment.service';


@Component({
  selector: 'maker-tags-profile',
  standalone: true,
  imports: [
    CommonModule,
    SharedUiComponentsModule,
    FormsModule, 
    ReactiveFormsModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzMessageModule,
    NzButtonModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  @ViewChild('guestOtpModal') guestOtpModal!: TemplateRef<any>;
  @ViewChild('passwordModal') passwordModal!: TemplateRef<any>;
  @ViewChild('nameModal') nameModal!: TemplateRef<any>;

  userDocs: IArtDoc[] = [];
  premiumDesigns: IArtDoc[] = [];
  purchasedArtDocIds: Set<string> = new Set();
  subscription: any = null;
  isLoading = false;
  sessionUser: ISessionUserModel | null = null;
  user: IUserModel = {} as IUserModel;

  // Account settings
  hasPassword = false;
  fullName = '';
  editFullName = '';
  newPassword = '';
  confirmNewPassword = '';
  isSavingName = false;
  isSavingPassword = false;

  // Guest OTP flow
  guestEmailForOtp = '';
  otpCode = '';
  isVerifyingOtp = false;

  constructor(
    private authService: AuthService,
    private userArtDocService: UserArtDocsService,
    private supabase: SupabaseService,
    private paymentService: PaymentService,
    private modal: NzModalService,
    private message: NzMessageService,
    private route: ActivatedRoute
  ) {}




  async ngOnInit(): Promise<void> {
    // Handle direct access via JWT token from purchase confirmation email.
    const accessToken = this.route.snapshot.queryParams['access_token'];
    if (accessToken) {
      try {
        await this.authService.storeUserSession(); // persists to NGXS + navigates to /profile
      } catch (err) {
        console.error('[profile] Failed to store token session:', err);
      }
      // Fall through — load profile data below with the freshly stored session
    }

    this.sessionUser = this.authService.getCurrentUserSession();
    this.user = this.sessionUser.user;

    // Check for guest_email param (from purchase email link)
    const guestEmail = this.route.snapshot.queryParams['guest_email'];
    if (guestEmail && !this.sessionUser?.user?.id) {
      // User not logged in, trigger OTP signin
      this.triggerGuestOTP(guestEmail);
      return; // Don't load profile yet
    }

    try {
      if (this.sessionUser?.user?.id) {
        // Process any pending purchase claim (guest who just logged in after buying)
        await this.processPendingClaim();

        this.userDocs = await this.userArtDocService.getUserArtDocs(this.sessionUser.user.id);
        await this.loadPremiumDesigns();
        await this.loadSubscription();
        await this.loadAccountSettings();
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    }
  }

  /** Claims a pending purchase stored before login (guest checkout flow) */
  private async processPendingClaim(): Promise<void> {
    const pendingSessionId = localStorage.getItem('pendingClaimSessionId');
    if (!pendingSessionId) return;

    try {
      const { data: { session: liveSession } } = await this.supabase.client.auth.getSession();
      const token = liveSession?.access_token;
      if (!token) return;

      const res = await fetch('/.netlify/functions/claim-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: pendingSessionId }),
      });

      if (res.ok) {
        localStorage.removeItem('pendingClaimSessionId');
        console.log('[profile] Pending purchase claimed successfully');
      } else {
        console.warn('[profile] claim-purchase returned', res.status);
      }
    } catch (err) {
      console.error('[profile] processPendingClaim error:', err);
    }
  }

  private async loadAccountSettings(): Promise<void> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('has_password, full_name')
      .eq('id', this.user.id!)
      .maybeSingle();
    this.hasPassword = data?.has_password ?? false;
    this.fullName = data?.full_name || '';
  }

  openPasswordModal(): void {
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.modal.create({
      nzTitle: this.hasPassword ? 'Change Password' : 'Add a Password',
      nzContent: this.passwordModal,
      nzOkText: 'Save',
      nzCancelText: 'Cancel',
      nzOkLoading: this.isSavingPassword,
      nzOnOk: () => this.savePassword(),
    });
  }

  async savePassword(): Promise<void> {
    if (!this.newPassword || this.newPassword.length < 8) {
      this.message.error('Password must be at least 8 characters', { nzDuration: 3000 });
      return Promise.reject();
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.message.error('Passwords do not match', { nzDuration: 3000 });
      return Promise.reject();
    }
    this.isSavingPassword = true;
    try {
      const { error } = await this.supabase.client.auth.updateUser({ password: this.newPassword });
      if (error) {
        this.message.error('Failed to update password: ' + error.message, { nzDuration: 4000 });
        return Promise.reject();
      }
      await this.supabase.client.from('profiles').update({ has_password: true }).eq('id', this.user.id!);
      this.hasPassword = true;
      this.message.success(this.hasPassword ? 'Password changed!' : 'Password added!', { nzDuration: 2500 });
    } finally {
      this.isSavingPassword = false;
    }
  }

  openNameModal(): void {
    this.editFullName = this.fullName;
    this.modal.create({
      nzTitle: this.fullName ? 'Edit Name' : 'Add Your Name',
      nzContent: this.nameModal,
      nzOkText: 'Save',
      nzCancelText: 'Cancel',
      nzOkLoading: this.isSavingName,
      nzOnOk: () => this.saveFullName(),
    });
  }

  async saveFullName(): Promise<void> {
    if (!this.editFullName.trim()) {
      this.message.error('Name cannot be empty', { nzDuration: 3000 });
      return Promise.reject();
    }
    this.isSavingName = true;
    try {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({ full_name: this.editFullName.trim() })
        .eq('id', this.user.id!);
      if (error) {
        this.message.error('Failed to update name', { nzDuration: 3000 });
        return Promise.reject();
      }
      this.fullName = this.editFullName.trim();
      this.message.success('Name updated!', { nzDuration: 2500 });
    } finally {
      this.isSavingName = false;
    }
  }

  private async loadPremiumDesigns(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('user_purchases')
      .select('art_doc_id, plan')
      .eq('user_id', this.user.id)
      .eq('plan', 'single');

    if (error) {
      console.error('Error loading premium designs:', error);
      return;
    }

    // Track which art_doc_ids are purchased
    this.purchasedArtDocIds = new Set(
      (data || [])
        .filter(p => p.art_doc_id)
        .map(p => p.art_doc_id)
    );
  }

  private async loadSubscription(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('user_purchases')
      .select('id, plan, created_at, expires_at, cancelled_at')
      .eq('user_id', this.user.id)
      .in('plan', ['monthly', 'yearly'])
      .maybeSingle();

    if (error) {
      console.error('Error loading subscription:', error);
      return;
    }

    if (data) {
      const now = new Date();
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      // Show subscription if: not expired (user keeps access until expires_at even if cancelled)
      const isActive = !expiresAt || expiresAt > now;
      this.subscription = isActive ? data : null;
    }
  }


  sendVerificationEmail(): void {

  }

  async triggerGuestOTP(email: string): Promise<void> {
    try {
      this.guestEmailForOtp = email;

      // Send OTP to guest email
      const { error } = await this.supabase.client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/profile` },
      });

      if (error) {
        console.error('[profile] OTP send error:', error);
        this.message.error('❌ Failed to send sign-in code', { nzDuration: 3000 });
        return;
      }

      this.message.success('✅ Sign-in code sent to your email', { nzDuration: 2000 });

      // Open modal for OTP input using template
      this.modal.create({
        nzTitle: 'Sign in to your profile',
        nzContent: this.guestOtpModal,
        nzOkText: 'Sign in',
        nzCancelText: 'Cancel',
        nzOnOk: () => this.verifyGuestOTP(),
        nzOkLoading: this.isVerifyingOtp,
      });
    } catch (err) {
      console.error('[profile] OTP trigger error:', err);
      this.message.error('❌ Failed to start sign-in', { nzDuration: 3000 });
    }
  }

  async verifyGuestOTP(): Promise<void> {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.message.error('❌ Please enter a valid 6-digit code', { nzDuration: 2500 });
      return Promise.reject();
    }

    this.isVerifyingOtp = true;

    try {
      const { data, error } = await this.supabase.client.auth.verifyOtp({
        email: this.guestEmailForOtp,
        token: this.otpCode,
        type: 'email',
      });

      if (error) {
        console.error('[profile] OTP verify error:', error);
        this.message.error('❌ Invalid code, please try again', { nzDuration: 3000 });
        this.isVerifyingOtp = false;
        return Promise.reject();
      }

      this.message.success('✅ Signed in successfully!', { nzDuration: 2500 });
      // Reload page after short delay to establish session
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error('[profile] OTP verification error:', err);
      this.message.error('❌ Sign-in failed', { nzDuration: 3000 });
      this.isVerifyingOtp = false;
      return Promise.reject();
    }
  }

  async resendGuestOTP(): Promise<void> {
    if (!this.guestEmailForOtp) return;

    try {
      const { error } = await this.supabase.client.auth.signInWithOtp({
        email: this.guestEmailForOtp,
        options: { emailRedirectTo: `${window.location.origin}/profile` },
      });

      if (error) {
        console.error('[profile] Resend OTP error:', error);
        this.message.error('❌ Failed to resend code', { nzDuration: 3000 });
        return;
      }

      this.message.success('✅ Code resent to your email', { nzDuration: 2000 });
      this.otpCode = '';
    } catch (err) {
      console.error('[profile] Resend error:', err);
      this.message.error('❌ Failed to resend', { nzDuration: 3000 });
    }
  }
 confirmDelete(id: string): void {
  this.modal.confirm({
    nzTitle: 'Delete this document?',
    nzContent: 'Are you sure you want to delete this document? This action cannot be undone.',
    nzOkText: 'Yes, delete',
    nzOkType: 'primary',
    nzOkDanger: true,
    nzCancelText: 'Cancel',
    nzOnOk: () => this.deleteArt(id)
  });
}

async deleteArt(id: string): Promise<void> {
  this.isLoading = true;
  const loadingMsg = this.message.loading('Deleting...', { nzDuration: 0 }).messageId;

  try {
    await this.userArtDocService.deleteUserArtDoc(id);
    this.userDocs = this.userDocs.filter(art => art.id !== id);
    this.message.remove(loadingMsg);
    this.message.success('✅ Document successfully deleted', { nzDuration: 2500 });
    if (this.sessionUser)
      this.userDocs = await this.userArtDocService.getUserArtDocs(this.sessionUser.user.id);
  } catch (error) {
    console.error(error);
    this.message.remove(loadingMsg);
    this.message.error('❌ An error occurred while deleting the document', { nzDuration: 3000 });
  } finally {
    this.isLoading = false;
  }
}

confirmCancelSubscription(): void {
  const planLabel = this.subscription?.plan === 'yearly' ? 'Pro Yearly' : 'Pro Monthly';
  const expiresAt = this.subscription?.expires_at
    ? new Date(this.subscription.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'unknown';

  this.modal.confirm({
    nzTitle: `Cancel ${planLabel}?`,
    nzContent: `Your subscription will remain active until ${expiresAt}. You won't be charged again after that date.`,
    nzOkText: 'Yes, cancel',
    nzOkType: 'primary',
    nzOkDanger: true,
    nzCancelText: 'Keep subscription',
    nzOnOk: () => this.cancelSubscription(),
  });
}

async reactivateSubscription(): Promise<void> {
  if (!this.subscription?.id) return;

  this.isLoading = true;
  const loadingMsg = this.message.loading('Reactivating subscription...', { nzDuration: 0 }).messageId;

  try {
    // Re-enable subscription on Stripe (cancel_at_period_end = false)
    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) {
      const res = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ purchaseId: this.subscription.id, cancel: false }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.message.remove(loadingMsg);
        if (resData.resubscribeRequired) {
          // Stripe subscription was permanently deleted — expire the Supabase record so it stops showing up
          await this.supabase.client
            .from('user_purchases')
            .update({ expires_at: new Date().toISOString() })
            .eq('id', this.subscription.id);
          this.subscription = null;
          this.message.warning(
            '⚠️ Your subscription was permanently cancelled and cannot be reactivated. Please subscribe again.',
            { nzDuration: 6000 }
          );
          this.isLoading = false;
          return;
        }
        throw new Error(resData.error || 'Stripe reactivation failed');
      }
    }

    // Clear cancelled_at in Supabase
    const { error } = await this.supabase.client
      .from('user_purchases')
      .update({ cancelled_at: null })
      .eq('id', this.subscription.id);

    if (error) throw error;

    this.message.remove(loadingMsg);
    this.message.success('✅ Subscription reactivated!', { nzDuration: 3000 });
    this.subscription.cancelled_at = null;
  } catch (error) {
    console.error(error);
    this.message.remove(loadingMsg);
    this.message.error('❌ Failed to reactivate subscription', { nzDuration: 3000 });
  } finally {
    this.isLoading = false;
  }
}

async cancelSubscription(): Promise<void> {
  if (!this.subscription?.id) return;

  this.isLoading = true;
  const loadingMsg = this.message.loading('Cancelling subscription...', { nzDuration: 0 }).messageId;

  try {
    // Cancel on Stripe (cancel_at_period_end = true — user keeps access until period ends)
    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) {
      const res = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ purchaseId: this.subscription.id, cancel: true }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || 'Stripe cancellation failed');
      }
      // stripeSkipped = no stripe_subscription_id stored (legacy record) — Stripe was NOT notified
      if (resData.stripeSkipped) {
        this.message.warning(
          '⚠️ Your subscription was cancelled in our system but Stripe may still charge you. Please also cancel directly in Stripe or contact support.',
          { nzDuration: 8000 }
        );
      }
    }

    // Mark as cancelled in Supabase — user keeps access until expires_at
    const { error } = await this.supabase.client
      .from('user_purchases')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', this.subscription.id);

    if (error) throw error;

    this.message.remove(loadingMsg);
    const expiresDate = new Date(this.subscription.expires_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.message.success(
      `✅ Subscription cancelled. You keep access until ${expiresDate}.`,
      { nzDuration: 4000 }
    );
    // Update local state to show as cancelled
    this.subscription.cancelled_at = new Date().toISOString();
  } catch (error) {
    console.error(error);
    this.message.remove(loadingMsg);
    this.message.error('❌ Failed to cancel subscription', { nzDuration: 3000 });
  } finally {
    this.isLoading = false;
  }
}

getOriginalId(design: IArtDoc): string {
  return (design as any).original_id || design.id;
}

isPurchased(design: IArtDoc): boolean {
  const id = this.getOriginalId(design);
  return id ? this.purchasedArtDocIds.has(id) : false;
}

async buyDesign(artDocId: string): Promise<void> {
  try {
    await this.paymentService.checkout('single', artDocId);
    // Reload premium designs after purchase
    setTimeout(() => this.loadPremiumDesigns(), 2000);
  } catch (error) {
    console.error('Purchase error:', error);
    this.message.error('❌ Failed to start checkout', { nzDuration: 3000 });
  }
}
}
