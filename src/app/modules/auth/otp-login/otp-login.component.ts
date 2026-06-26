import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslocoModule } from '@jsverse/transloco';
import { SupabaseService } from '../../shared/services/supabase.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { OtpFormSupComponent } from '../otp-form-sup/otp-form-sup.component';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';
import { ENVIRONMENTS } from '../../../core/app.tokens';

@Component({
  selector: 'app-otp-login',
  imports: [CommonModule, FormsModule, NzDividerModule, NzIconModule, NzButtonModule, ReactiveFormsModule, TranslocoModule],
  templateUrl: './otp-login.component.html',
  styleUrl: './otp-login.component.scss'
})
export class OtpLoginComponent {
  loginForm!: FormGroup;
  loading = false;
  hasPassword = signal(false);
  email!: string;
  lastOtpRequestTime = 0;
  otpCooldown = 60000; // 60 secondes

  modal = inject(NzModalService);
  envirenement = inject(ENVIRONMENTS);
  message = inject(NzMessageService);

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private modalRef: NzModalRef,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['']
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.email = this.loginForm.value.email;

    // Step 1: Check if user has password
    const userHasPassword = await this.supabaseService.checkHasPassword(this.email);
    this.hasPassword.set(userHasPassword);

    if (userHasPassword) {
      // If password is already filled, try login
      const password = this.loginForm.value.password;
      if (password) {
        const {data, error } = await this.supabaseService.signInWithPassword(this.email, password);
        this.loading = false;

        if (error) {
          console.error(error);
        } else {
          this.modalRef?.destroy();
          this.authService.storeUserSession();
        }
      } else {
        // Ask user to enter password
        this.loading = false;
      }

    } else {
      // If no password, fallback to OTP
      await this.connecting_using_otp();
    }
  }

  async connecting_using_otp() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastOtpRequestTime;

    if (timeSinceLastRequest < this.otpCooldown) {
      const secondsLeft = Math.ceil((this.otpCooldown - timeSinceLastRequest) / 1000);
      console.warn(`Cooldown actif. Veuillez attendre ${secondsLeft}s avant la prochaine tentative`);
      this.loading = false;
      return;
    }

    this.lastOtpRequestTime = now;
    const {data, error } = await this.supabaseService.signInWithOtp(this.email);
    this.loading = false;

    if (error) {
      console.error('OTP Error:', error);
      if (error.message?.includes('email rate limit')) {
        this.message.error('Trop de tentatives. Veuillez attendre avant de renvoyer un code.');
      }
    } else {
      this.modalRef?.destroy();
      this.modalRef = this.modal.create({
        nzContent: OtpFormSupComponent,
        nzData: { email: this.email },
        nzMaskClosable: false,
        nzFooter: null
      });
    }
  }

  loginWithGoogle() {
    localStorage.setItem('redirectAfterLogin', this.router.url);
    this.supabaseService.signInWithGoogle();
  }
}
