import { Component, Inject, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { OtpLoginComponent } from '../../../auth/otp-login/otp-login.component';
import { LangSwitcherComponent } from '../lang-switcher/lang-switcher.component';
declare var bootstrap: any;
@Component({
  selector: 'maker-tags-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NzDrawerModule, NzDropDownModule, NzButtonModule, NzModalModule, TranslocoModule, LangSwitcherComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  
})
export class HeaderComponent implements OnInit {
  private modalRef?: NzModalRef;

  authService = inject(AuthService);
  isAuthenticated = this.authService.isLoggedIn;
  modal = inject(NzModalService);
  router = inject(Router);

  isDesktop = true;
  isCollapsed = false;

  menuItems = [
    { path: '/', label: 'Home' },
    { path: '/tags', label: 'Models' },
    { path: '/about', label: 'About' },
    { path: '/questions', label: 'Questions' },
    { path: '/contact', label: 'Contact' },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: any) {
    //  this.isAuthenticated = this.authService.isLoggedIn; 
  }

  ngOnInit(): void {
   
    if (isPlatformBrowser(this.platformId)) {
      this.isDesktop = window.innerWidth > 863;
      window.addEventListener('resize', () => {
        this.isDesktop = window.innerWidth > 863;
      });

     
    }
  }



  get isAdmin$() {
    return this.authService.isAdmin$;
  }

  closeMenu() {
    this.isCollapsed = false;
  }

  goTo(path: string) {
    this.router.navigate([path]);
    this.closeMenu();
  }

  logout() {
    this.authService.logout();
  }

  openLoginModal() {
    this.modalRef?.destroy();
    this.modalRef = this.modal.create({
      nzContent: OtpLoginComponent,
      nzMaskClosable: false,
      nzFooter: null,
    });
  }

  openLoginFromOffcanvas() {
  // Fermer l'offcanvas via DOM (Bootstrap)
  const offcanvasEl = document.getElementById('mobileMenu');
  if (offcanvasEl) {
    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if (bsOffcanvas) {
      bsOffcanvas.hide();
    } else {
      // fallback: remove "show" class
      offcanvasEl.classList.remove('show');
      document.body.classList.remove('offcanvas-backdrop', 'show'); // tidy
    }
  }
  // Ouvrir modal
  this.openLoginModal();
}
}
