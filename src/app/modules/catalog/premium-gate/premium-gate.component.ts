import { Component, Inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { PaymentService, PlanId } from '../../shared/services/payment.service';
import { AuthService } from '../../shared/services/auth.service';
import { SupabaseService } from '../../shared/services/supabase.service';
import { TranslocoModule } from '@jsverse/transloco';

type Step = 'checkout' | 'plans' | 'signin';

@Component({
  selector: 'maker-tags-premium-gate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzButtonModule, TranslocoModule],
  templateUrl: './premium-gate.component.html',
  styleUrl: './premium-gate.component.css',
})
export class PremiumGateComponent implements OnInit {
  @Input() artDocId!: string;
  @Input() artTitle!: string;

  step: Step = 'checkout';
  selectedPlan: PlanId = 'single';

  // Guest checkout
  guestEmail = '';
  guestLoading = false;
  guestError = '';

  // Sign-in form
  authEmail = '';
  authOtp = '';
  authStep: 'email' | 'otp' = 'email';
  authLoading = false;
  authError = '';

  billingCycle: 'monthly' | 'yearly' = 'yearly';

  constructor(
    private readonly modalRef: NzModalRef,
    private readonly payment: PaymentService,
    private readonly auth: AuthService,
    private readonly supabase: SupabaseService,
    @Inject(NZ_MODAL_DATA) modalData: { artDocId: string; artTitle: string; initialPlan?: PlanId }
  ) {
    this.artDocId = modalData.artDocId;
    this.artTitle = modalData.artTitle;
    if (modalData.initialPlan) this.selectedPlan = modalData.initialPlan;
  }

  ngOnInit(): void {
    // If already authenticated, skip straight to payment
    const session = this.auth.getCurrentUserSession();
    if (session?.user?.id) {
      this.proceedAuthenticated();
    }
  }

  private async proceedAuthenticated(): Promise<void> {
    try {
      await this.payment.checkout(
        this.selectedPlan,
        this.selectedPlan === 'single' ? this.artDocId : undefined
      );
      this.modalRef.close('purchased');
    } catch (e) {
      console.error(e);
    }
  }

  // ── GUEST CHECKOUT ───────────────────────────────────────────────────────────

  async payAsGuest(): Promise<void> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.guestEmail || !emailRegex.test(this.guestEmail)) {
      this.guestError = 'Please enter a valid email address.';
      return;
    }
    this.guestLoading = true;
    this.guestError = '';
    try {
      await this.payment.checkout(
        this.selectedPlan,
        this.selectedPlan === 'single' ? this.artDocId : undefined,
        this.guestEmail
      );
      this.modalRef.close('guest-checkout');
    } catch (e: any) {
      this.guestError = e?.message || 'Something went wrong. Please try again.';
    } finally {
      this.guestLoading = false;
    }
  }

  // ── SIGN IN ──────────────────────────────────────────────────────────────────

  loginWithGoogle(): void {
    if (this.guestEmail) {
      localStorage.setItem('pendingCheckout', JSON.stringify({
        plan: this.selectedPlan,
        artDocId: this.artDocId,
      }));
    }
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    this.supabase.signInWithGoogle();
  }

  async submitEmail(): Promise<void> {
    if (!this.authEmail) return;
    this.authLoading = true;
    this.authError = '';
    const { error } = await this.supabase.signInWithOtp(this.authEmail);
    this.authLoading = false;
    if (error) { this.authError = error.message; return; }
    this.authStep = 'otp';
  }

  async submitOtp(): Promise<void> {
    if (this.authOtp.length < 6) return;
    this.authLoading = true;
    this.authError = '';
    const { data, error } = await this.supabase.verifyOtp(this.authEmail, this.authOtp);
    if (error) { this.authLoading = false; this.authError = error.message; return; }
    if (data.user?.id) {
      if (!data.user.user_metadata?.['is_in_profiles']) {
        await this.supabase.addUserToSupabase(data.user.id, this.authEmail, '', 'guest-user');
        await this.supabase.client.auth.updateUser({ data: { is_in_profiles: true } });
      }
      await this.auth.storeUserSession();
    }
    await this.proceedAuthenticated();
  }

  selectPlan(plan: PlanId): void {
    this.selectedPlan = plan;
    this.step = 'checkout';
  }

  get planPrice(): string {
    if (this.selectedPlan === 'single') return '€2';
    if (this.selectedPlan === 'monthly') return '€12/mo';
    return '€70/yr';
  }

  close(): void { this.modalRef.close(); }
}
