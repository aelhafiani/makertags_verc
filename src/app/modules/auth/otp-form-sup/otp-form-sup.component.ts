import { Component, Inject, inject, PLATFORM_ID } from '@angular/core';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgOtpInputComponent } from 'ng-otp-input';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { SupabaseService } from '../../shared/services/supabase.service';
import { OtpCompleteRegisterComponent } from '../otp-register/otp-register-complete.component';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-otp-form-sup',
  imports: [CommonModule, FormsModule, NzDividerModule, NgOtpInputComponent, ReactiveFormsModule], 
  templateUrl: './otp-form-sup.component.html',
  styleUrl: './otp-form-sup.component.scss'
})
export class OtpFormSupComponent {
  email!: string;
  otpNumber = '';    // bound to ng-otp-input
  loading = false;
  errorMsg = '';

  private modalRef = inject(NzModalRef);
modal = inject(NzModalService);
  constructor(@Inject(PLATFORM_ID) private platformId: any,private supabaseService: SupabaseService , private authService:AuthService) {
    const data = this.modalRef.getConfig()?.nzData ?? {};
    this.email = data.email;


  }

 // Triggered when OTP input changes
  onOtpChange(otp: string) {
    this.otpNumber = otp;
  }

  // ✅ Verify OTP with Supabase
  async verifyOtp() {
    if (!this.email || !this.otpNumber) {
      this.errorMsg = 'Please enter your email and the code.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    const { data, error } = await this.supabaseService.verifyOtp(this.email, this.otpNumber);
    this.loading = false;
    if (error) {
      this.errorMsg = error.message;
      return;
    } 
    if(data.user?.id) {
      const userdata = await  this.supabaseService.client.auth.getUser();

      const isPasswordSet = userdata.data.user?.user_metadata['has_password'] || false; 
      if(!userdata.data.user?.user_metadata['is_in_profiles']){
            await this.supabaseService.addUserToSupabase(data.user.id, this.email, '' , 'guest-user');
            await  this.supabaseService.client.auth.updateUser({ data: { is_in_profiles: true } });
            
      }
      if(!isPasswordSet){
        this.modalRef?.destroy();
          this.modalRef = this.modal.create({
            nzContent: OtpCompleteRegisterComponent,
            nzData: {user: userdata.data.user},
            nzMaskClosable: false,
            nzFooter: null
          });
      }
        this.authService.storeUserSession();
      
   
    }

  }

  // Optional: resend OTP
  async resendOtp() {
    this.errorMsg = '';
    const { error } = await this.supabaseService.sendOtp(this.email);
    if (error) {
      this.errorMsg = error.message;
    }
  }
}
