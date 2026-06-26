import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ContactService } from './contactService';

@Component({
  selector: 'maker-tags-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TranslocoModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  contactForm: FormGroup;
  responseMessage: string | null = null;

  constructor(private fb: FormBuilder, private contactService: ContactService, private transloco: TranslocoService) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.contactForm.valid) {
      const formData = this.contactForm.value;
      this.contactService.sendMessage(formData).subscribe(
        () => {
          this.responseMessage = this.transloco.translate('contact.successMsg');
          this.contactForm.reset();
        },
        (error) => {
          this.responseMessage = this.transloco.translate('contact.errorMsg');
          console.error('Error sending message', error);
        }
      );
    }
  }
}
