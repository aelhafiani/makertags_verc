import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { SupabaseService } from '../../../shared/services/supabase.service';

export interface PurchaseRow {
  id: string;
  plan: 'single' | 'monthly' | 'yearly';
  stripe_session_id: string | null;
  expires_at: string | null;
  created_at: string;
  guest_email: string | null;
  profiles: { id: string; email: string | null; full_name: string | null; app_role: string | null } | null;
  art_docs: { id: string; title: string | null; name: string | null } | null;
  // computed
  isValid: boolean;
  displayEmail: string;
  displayName: string;
  displayTemplate: string;
  resending: boolean;
}

@Component({
  selector: 'app-users-purchases',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzToolTipModule,
    NzSpinModule,
    NzBadgeModule,
  ],
  templateUrl: './users-purchases.component.html',
  styleUrl: './users-purchases.component.scss',
})
export class UsersPurchasesComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private message = inject(NzMessageService);

  loading = false;
  allPurchases: PurchaseRow[] = [];
  filtered: PurchaseRow[] = [];
  searchQuery = '';

  // Filters
  filterPlan: 'all' | 'single' | 'monthly' | 'yearly' = 'all';
  filterStatus: 'all' | 'valid' | 'expired' = 'all';

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      // ── 1. Fetch all purchases ────────────────────────────────────────────
      const { data: purchases, error } = await this.supabase.client
        .from('user_purchases')
        .select('id, user_id, art_doc_id, plan, stripe_session_id, expires_at, created_at, guest_email')
        .order('created_at', { ascending: false });

      if (error) {
        this.message.error('Failed to load purchases: ' + error.message);
        return;
      }

      // ── 2. Batch-fetch profiles for all unique user_ids ───────────────────
      const userIds = [...new Set((purchases as any[]).map((p) => p.user_id).filter(Boolean))];
      const artDocIds = [...new Set((purchases as any[]).map((p) => p.art_doc_id).filter(Boolean))];

      const [profilesRes, artDocsRes] = await Promise.all([
        userIds.length
          ? this.supabase.client
              .from('profiles')
              .select('id, email, full_name, app_role')
              .in('id', userIds)
          : Promise.resolve({ data: [] }),
        artDocIds.length
          ? this.supabase.client
              .from('art_docs')
              .select('id, title, name')
              .in('id', artDocIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profilesRes.data as any[]).map((p) => [p.id, p]));
      const artDocMap  = new Map((artDocsRes.data  as any[]).map((a) => [a.id, a]));

      // ── 3. Merge ──────────────────────────────────────────────────────────
      this.allPurchases = (purchases as any[]).map((row) =>
        this.mapRow(row, profileMap.get(row.user_id) ?? null, artDocMap.get(row.art_doc_id) ?? null)
      );
      this.applyFilters();
    } finally {
      this.loading = false;
    }
  }

  private mapRow(row: any, profile: any, artDoc: any): PurchaseRow {

    const isValid =
      row.plan === 'single' ||
      !row.expires_at ||
      new Date(row.expires_at) > new Date();

    return {
      ...row,
      profiles: profile ?? null,
      art_docs: artDoc ?? null,
      isValid,
      displayEmail:    profile?.email    || row.guest_email || '—',
      displayName:     profile?.full_name || '—',
      displayTemplate: artDoc?.title     || artDoc?.name    || '(standalone plan)',
      resending: false,
    };
  }

  applyFilters(): void {
    let list = this.allPurchases;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.displayEmail.toLowerCase().includes(q) ||
          r.displayName.toLowerCase().includes(q) ||
          (r.stripe_session_id || '').toLowerCase().includes(q)
      );
    }

    if (this.filterPlan !== 'all') {
      list = list.filter((r) => r.plan === this.filterPlan);
    }

    if (this.filterStatus !== 'all') {
      list = list.filter((r) =>
        this.filterStatus === 'valid' ? r.isValid : !r.isValid
      );
    }

    this.filtered = list;
  }

  onSearch(): void {
    this.applyFilters();
  }

  setFilterPlan(plan: typeof this.filterPlan): void {
    this.filterPlan = plan;
    this.applyFilters();
  }

  setFilterStatus(status: typeof this.filterStatus): void {
    this.filterStatus = status;
    this.applyFilters();
  }

  async resendEmail(row: PurchaseRow): Promise<void> {
    const email = row.profiles?.email || row.guest_email;
    if (!email) {
      this.message.warning('No email address found for this user.');
      return;
    }
    row.resending = true;
    try {
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/.netlify/functions/admin-resend-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: row.profiles?.id || null,
          email,
          purchaseId: row.id,
        }),
      });

      if (res.ok) {
        this.message.success(`Email resent to ${email}`);
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        this.message.error('Failed: ' + (err.error || res.statusText));
      }
    } catch {
      this.message.error('Network error while resending email.');
    } finally {
      row.resending = false;
    }
  }

  planColor(plan: string): string {
    return plan === 'yearly' ? 'gold' : plan === 'monthly' ? 'blue' : 'default';
  }

  get stats() {
    const total   = this.allPurchases.length;
    const valid   = this.allPurchases.filter((r) => r.isValid).length;
    const expired = total - valid;
    return { total, valid, expired };
  }
}
