import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pw = group.get('password')?.value;
  const cpw = group.get('confirm_password')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
};
import { SupabaseService } from '../../shared/services/supabase.service';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-otp-register',
  imports: [CommonModule,FormsModule,NzDividerModule,NzIconModule,NzButtonModule,ReactiveFormsModule],
  templateUrl: './otp-register-complete.component.html',
  styleUrl: './otp-register-complete.component.scss'
})
export class OtpCompleteRegisterComponent {
  registerForm!: FormGroup;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  user!: any;
  modalRef = inject(NzModalRef);
  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private authService:AuthService
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      full_name: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required],
    }, { validators: passwordMatchValidator });
     const data = this.modalRef.getConfig()?.nzData ?? {};
     this.user = data.user;
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;
    this.loading = true;

    const { full_name, password } = this.registerForm.value;

        // ✅ Store password + profile data
    try {
      const result = await this.supabase.completeProfile(this.user.id, full_name, password);
      if (result.success) {
         this.modalRef?.destroy();
       
        // Navigate user to dashboard
      }
    } catch (err:any) {
      console.error("Failed to complete profile:", err.message);
    }
        this.loading = false;


  }
}
