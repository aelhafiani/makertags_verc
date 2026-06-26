import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'maker-tags-forgot-password',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './forgot-password-email.component.html',
  styleUrl: './forgot-password-email.component.css',
})
export class ForgotPasswordEmailFormComponent {

  fb = inject(FormBuilder)
  authService = inject(AuthService)
  nzMessageService = inject(NzMessageService)
  modalRef = inject(NzModalRef)
  forgomForm:FormGroup = new FormGroup({});
  isSent: boolean = false;


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.forgomForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    })
  }
  onSubmit() {
     this.forgotPassword();
  }

  forgotPassword(){
    if(this.forgomForm.invalid){
      this.nzMessageService.error('Please enter a valid email address.');
    }else{
      // this.authService.sendPasswordResetEmail(this.forgomForm.get('email')?.value).then(() => {
      //   this.nzMessageService.success('Please check your email to reset your password.');
      //   this.modalRef.close();
      // }).catch((error) => {
      //   console.error('Error sending password reset email:', error);
      // });
    }

    
  }
}
