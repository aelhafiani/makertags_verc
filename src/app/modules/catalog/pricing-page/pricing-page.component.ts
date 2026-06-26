import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaymentService, PlanId } from '../../shared/services/payment.service';
import { AuthService } from '../../shared/services/auth.service';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { PremiumGateComponent } from '../premium-gate/premium-gate.component';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'maker-tags-pricing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, NzModalModule, PremiumGateComponent, TranslocoModule],
  templateUrl: './pricing-page.component.html',
  styleUrl: './pricing-page.component.css',
})
export class PricingPageComponent {
  billingCycle: 'monthly' | 'yearly' = 'yearly';
  loading: PlanId | null = null;

  constructor(
    private readonly payment: PaymentService,
    private readonly auth: AuthService,
    private readonly modal: NzModalService
  ) {}

  async checkout(plan: PlanId): Promise<void> {
    this.loading = plan;
    try {
      const session = this.auth.getCurrentUserSession();
      // If authenticated, go straight to Stripe
      if (session?.user?.id) {
        await this.payment.checkout(plan);
      } else {
        // Not authenticated → open modal with sign-in OR guest checkout
        this.openPremiumGate(plan);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = null;
    }
  }

  private openPremiumGate(plan: PlanId): void {
    this.modal.create({
      nzTitle: undefined,
      nzContent: PremiumGateComponent,
      nzData: {
        initialPlan: plan,
      },
      nzFooter: null,
      nzWidth: 480,
      nzBodyStyle: { padding: '24px' },
      nzMaskClosable: true,
      nzKeyboard: true,
    });
  }
}
