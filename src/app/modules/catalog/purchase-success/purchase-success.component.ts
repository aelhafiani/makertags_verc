import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { SupabaseService } from '../../shared/services/supabase.service';

/** localStorage key — array of unlocked artDocIds (Stripe-verified, for guests) */
export const UNLOCKED_ART_DOCS_KEY = 'unlockedArtDocs';
/** localStorage key — pending Stripe session to claim once the user logs in */
export const PENDING_CLAIM_SESSION_KEY = 'pendingClaimSessionId';

@Component({
  selector: 'app-purchase-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './purchase-success.component.html',
  styleUrl: './purchase-success.component.css',
})
export class PurchaseSuccessComponent implements OnInit {
  isLoggedIn = false;
  editorReturnUrl: string | null = null;
  verifying = true;

  constructor(
    private auth: AuthService,
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  async ngOnInit(): Promise<void> {
    const session = this.auth.getCurrentUserSession();
    this.isLoggedIn = !!session?.user?.id;

    if (!isPlatformBrowser(this.platformId)) {
      this.verifying = false;
      return;
    }

    // Recover editor return URL stored before payment started
    const returnUrl = localStorage.getItem('editorReturnUrl');
    if (returnUrl) {
      localStorage.removeItem('editorReturnUrl');
      this.editorReturnUrl = returnUrl;
    }

    const sessionId = this.route.snapshot.queryParams['session_id'];
    if (sessionId) {
      await this.verifyAndClaim(sessionId);
    }
    this.verifying = false;
  }

  private async verifyAndClaim(sessionId: string): Promise<void> {
    // ── 1. Verify Stripe session and unlock device access ─────────────────
    try {
      const res = await fetch(
        `/.netlify/functions/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`
      );
      if (res.ok) {
        const { artDocId } = await res.json() as { artDocId: string | null };
        if (artDocId) {
          // Store device-scoped unlock so editor skips watermark even for guests
          const existing: string[] = JSON.parse(localStorage.getItem(UNLOCKED_ART_DOCS_KEY) ?? '[]');
          if (!existing.includes(artDocId)) {
            existing.push(artDocId);
            localStorage.setItem(UNLOCKED_ART_DOCS_KEY, JSON.stringify(existing));
          }
          // Build return URL from artDocId if we don't already have one
          if (!this.editorReturnUrl) {
            this.editorReturnUrl = `/creator/${artDocId}`;
          }
        }
      }
    } catch (err) {
      console.error('[purchase-success] verify-checkout-session error:', err);
    }

    // ── 2. Claim purchase (clone art doc to profile) ──────────────────────
    // Get the live Supabase session (might be fresher than NGXS snapshot)
    const { data: { session: liveSession } } = await this.supabase.client.auth.getSession();
    const accessToken = liveSession?.access_token ?? null;

    if (accessToken) {
      // User is authenticated → claim immediately
      try {
        await fetch('/.netlify/functions/claim-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ sessionId }),
        });
        console.log('[purchase-success] claim-purchase called for logged-in user');
      } catch (err) {
        console.error('[purchase-success] claim-purchase error:', err);
      }
    } else {
      // Guest: store session_id so the profile page can claim it after login
      localStorage.setItem(PENDING_CLAIM_SESSION_KEY, sessionId);
      console.log('[purchase-success] Stored pendingClaimSessionId for post-login claim');
    }

    // ── 3. Auto-redirect to editor if return URL is set ───────────────────
    if (this.editorReturnUrl) {
      this.router.navigateByUrl(this.editorReturnUrl);
    }
  }

  goBackToEditor(): void {
    if (this.editorReturnUrl) {
      this.router.navigateByUrl(this.editorReturnUrl);
    }
  }
}
