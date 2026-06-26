import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'maker-tags-terms-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms-page.component.html',
  styleUrl: './terms-page.component.css',
})
export class TermsPageComponent {
  readonly effectiveDate = 'April 17, 2026';
  readonly companyName  = 'Webartfly LLC';
  readonly siteName     = 'TagPrintly.com';
  readonly supportEmail = 'contact@tagprintly.com';
  readonly supportAddr  = '340 S Lemon Ave #5766, Walnut, CA 91789, United States';
}
