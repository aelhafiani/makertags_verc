import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'maker-tags-refund-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './refund-page.component.html',
  styleUrl: './refund-page.component.css',
})
export class RefundPageComponent {
  readonly effectiveDate = 'April 17, 2026';
  readonly companyName  = 'Webartfly LLC';
  readonly siteName     = 'TagPrintly.com';
  readonly supportEmail = 'contact@tagprintly.com';
}
