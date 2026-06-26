import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { PublicArtService, IPublicArtDoc } from '../../../shared/services/public-art.service';

export interface IShareModalData {
  artDocId: string;
  title?: string;
  description?: string;
  previewUrl?: string;
  publicUrl?: string;
}

@Component({
  selector: 'maker-tags-share-public-link',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzButtonModule,
    NzInputModule,
    NzFormModule,
    NzIconModule,
    NzCheckboxModule
  ],
  template: `
    <div class="share-modal-container">
      <div class="success-section" *ngIf="isLinkCreated">
        <div class="success-header">
          <span nz-icon nzType="check-circle" nzTheme="fill" style="color: #52c41a; font-size: 32px;"></span>
          <h3>Share this design (optional)</h3>
        </div>
        
        <p class="description">Create a public link so others can view and edit this art.</p>

        <div class="link-container">
          <input 
            type="text" 
            nz-input 
            [value]="publicUrl" 
            readonly
            class="public-link-input"
          />
          <button 
            nz-button 
            nzType="primary" 
            (click)="copyToClipboard()"
            class="copy-btn"
          >
            <span nz-icon nzType="copy"></span>
            Copy Link
          </button>
        </div>

        <div class="info-box">
          <p><strong>Preview URL:</strong> {{ publicArtDoc?.preview_url | slice:0:50 }}...</p>
        </div>

        <p class="close-text">You can close this and continue editing anytime.</p>
      </div>

      <div class="form-section" *ngIf="!isLinkCreated">
        <h3>Create Public Link</h3>
        
        <form [formGroup]="shareForm">
          <div class="form-group">
            <label>Title <span class="optional">(optional)</span></label>
            <input 
              nz-input 
              formControlName="title" 
              placeholder="Give your art a title (leave empty to auto-generate)"
            />
            <p class="hint" *ngIf="shareForm.get('title')?.errors?.['minlength']">
              Title must be at least 3 characters
            </p>
          </div>

          <div class="form-group">
            <label>Description (SEO) <span class="optional">(optional)</span></label>
            <textarea 
              nz-input 
              formControlName="description" 
              placeholder="Add a short description for search engines (10-160 characters)"
              [nzAutosize]="{ minRows: 3, maxRows: 5 }"
            ></textarea>
            <div class="char-count">
              {{ shareForm.get('description')?.value?.length || 0 }}/160 characters
            </div>
            <p class="hint" *ngIf="shareForm.get('description')?.errors?.['minlength']">
              Description must be at least 10 characters
            </p>
            <p class="hint" *ngIf="shareForm.get('description')?.errors?.['maxlength']">
              Description must not exceed 160 characters
            </p>
          </div>

          <div class="form-group checkbox-group">
            <label nz-checkbox formControlName="is_indexable">
              Allow search engines to index this page (better for SEO)
            </label>
          </div>

          <div class="form-actions">
            <button 
              nz-button 
              (click)="cancel()"
            >
              Cancel
            </button>
            <button 
              nz-button 
              nzType="primary" 
              (click)="createPublicLink()"
              [disabled]="shareForm.invalid || isLoading"
            >
              <span *ngIf="isLoading" nz-icon nzType="loading" nzSpin></span>
              Create Public Link
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .share-modal-container {
      padding: 20px;
    }

    .success-section {
      text-align: center;
    }

    .success-header {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .success-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .description {
      color: #666;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .link-container {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .public-link-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #d9d9d9;
      border-radius: 2px;
    }

    .copy-btn {
      white-space: nowrap;
    }

    .info-box {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      text-align: left;
      font-size: 13px;
    }

    .close-text {
      color: #999;
      font-size: 13px;
      margin: 0;
    }

    .form-section {
      text-align: left;
    }

    .form-section h3 {
      margin-bottom: 20px;
      font-size: 16px;
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 14px;
    }

    .form-group .optional {
      color: #999;
      font-weight: 400;
      font-size: 12px;
    }

    .form-group .hint {
      color: #ff4d4f;
      font-size: 12px;
      margin-top: 4px;
      margin-bottom: 0;
    }

    .form-group textarea {
      width: 100%;
    }

    .char-count {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
      text-align: right;
    }

    .checkbox-group {
      margin-top: 16px;
      margin-bottom: 24px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `]
})
export class SharePublicLinkComponent implements OnInit {
  shareForm!: FormGroup;
  isLoading = false;
  isLinkCreated = false;
  publicUrl: string = '';
  publicArtDoc?: IPublicArtDoc;

  constructor(
    private formBuilder: FormBuilder,
    private publicArtService: PublicArtService,
    private nzMessageService: NzMessageService,
    private modalRef: NzModalRef,
    @Inject(NZ_MODAL_DATA) public data: IShareModalData
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.checkExistingPublicLink();
  }

  private initForm(): void {
    // Clean description: remove HTML tags and limit length
    const cleanDescription = this.cleanDescription(this.data.description || '');
    
    this.shareForm = this.formBuilder.group({
      title: [this.data.title || '', [Validators.minLength(3)]],
      description: [cleanDescription, [Validators.minLength(10), Validators.maxLength(160)]],
      is_indexable: [true]
    });
  }

  private cleanDescription(description: string): string {
    if (!description) return '';
    
    // Remove HTML tags
    let cleaned = description.replace(/<[^>]*>/g, ' ');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Limit to 160 characters (max length for description)
    if (cleaned.length > 160) {
      cleaned = cleaned.substring(0, 157) + '...';
    }
    
    return cleaned;
  }

  private checkExistingPublicLink(): void {
    this.publicArtService.getPublicLinkForArtDoc(this.data.artDocId).subscribe((link) => {
      if (link) {
        this.publicArtDoc = link;
        this.publicUrl = this.generatePublicUrl(link.public_slug);
        this.isLinkCreated = true;
      }
    });
  }

  createPublicLink(): void {
    if (this.shareForm.invalid) {
      this.nzMessageService.error('Please fill in all required fields correctly');
      return;
    }

    // If title is empty, generate one from timestamp
    let title = this.shareForm.value.title?.trim();
    if (!title || title.length < 3) {
      title = `Art - ${new Date().toLocaleDateString()}`;
    }

    this.isLoading = true;
    const slug = this.publicArtService.generateSlug(title);

    const publicArtDoc: IPublicArtDoc = {
      user_art_doc_id: this.data.artDocId,
      public_slug: slug,
      title: title,
      description: this.shareForm.value.description || '',
      preview_url: this.data.previewUrl || '',
      is_indexable: this.shareForm.value.is_indexable
    };

    this.publicArtService.createPublicLink(publicArtDoc).subscribe({
      next: (doc) => {
        this.publicArtDoc = doc;
        this.publicUrl = this.generatePublicUrl(doc.public_slug);
        this.isLinkCreated = true;
        this.isLoading = false;
        this.nzMessageService.success('Public link created successfully!');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error creating public link:', error);
        this.nzMessageService.error('Failed to create public link');
      }
    });
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.nzMessageService.success('Link copied to clipboard!');
    }).catch(() => {
      this.nzMessageService.error('Failed to copy link');
    });
  }

  cancel(): void {
    this.modalRef.close();
  }

  private generatePublicUrl(slug: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/public-art/${slug}`;
  }
}
