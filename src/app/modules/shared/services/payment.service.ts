import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export type PlanId = 'single' | 'monthly' | 'yearly';

export interface PlanInfo {
  id: PlanId;
  label: string;
  price: number;
  currency: string;
  period?: string;
  saving?: string;
}

export const PLANS: Record<PlanId, PlanInfo> = {
  single: {
    id: 'single',
    label: 'Single Design',
    price: 2,
    currency: '€',
  },
  monthly: {
    id: 'monthly',
    label: 'Pro Monthly',
    price: 12,
    currency: '€',
    period: '/month',
  },
  yearly: {
    id: 'yearly',
    label: 'Pro Yearly',
    price: 70,
    currency: '€',
    period: '/year',
    saving: 'Save 51%',
  },
};

export interface UserPurchase {
  user_id: string;
  art_doc_id: string | null; // null = subscription (unlimited)
  plan: PlanId;
  created_at: string;
  expires_at: string | null; // null = never expires for single purchase
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  /**
   * Check if the current user has access to a given art doc.
   * Returns true if:
   *  - user has an active subscription (monthly/yearly)
   *  - user has purchased this specific art doc
   *  - art doc is not premium
   */
  async hasAccess(artDocId: string, isPremium: boolean): Promise<boolean> {
    if (!isPremium) return true;

    const session = this.auth.getCurrentUserSession();
    const userId = session?.user?.id;
    if (!userId) return false;
    if (session?.user?.app_role === 'admin') return true;

    // Single purchase for this specific template
    const { data: single, error: singleErr } = await this.supabase.client
      .from('user_purchases')
      .select('id, art_doc_id')
      .eq('user_id', userId)
      .eq('plan', 'single')
      .eq('art_doc_id', artDocId)
      .limit(1);

    console.log('[hasAccess] artDocId:', artDocId, '| single rows:', single, '| err:', singleErr);
    if (single?.length) { console.log('[hasAccess] → true via single purchase'); return true; }

    // Active subscription (monthly/yearly) covers all templates
    // User keeps access until expires_at, even if cancelled
    const { data: sub } = await this.supabase.client
      .from('user_purchases')
      .select('plan, expires_at')
      .eq('user_id', userId)
      .in('plan', ['monthly', 'yearly'])
      .limit(5);

    console.log('[hasAccess] sub rows:', sub);
    if (!sub?.length) { console.log('[hasAccess] → false (no subscription)'); return false; }
    const now = new Date();
    const result = sub.some((row) => !row.expires_at || new Date(row.expires_at) >= now);
    console.log('[hasAccess] → ', result, 'via subscription');
    return result;
  }

  async checkout(plan: PlanId, artDocId?: string, customerEmail?: string): Promise<void> {
    const session = this.auth.getCurrentUserSession();
    const userId = session?.user?.id ?? null;
    const email = customerEmail || session?.user?.email || null;

    const successUrl = `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}${window.location.pathname}?payment=cancelled`;

    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, artDocId, userId, customerEmail: email, successUrl, cancelUrl }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || 'Checkout failed');
    }

    const { url } = await response.json();
    window.open(url, '_blank');
  }
}
