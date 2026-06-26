import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { IPublicArtDoc, PublicArtService } from '../../../shared/services/public-art.service';
import { IArtDoc } from '../../../shared/domaine/entities/art';
import { ArtDocsService } from '../../../shared/services/art-docs.service';
import { UserArtDocsService } from '../../../shared/services/users_art_docs.service';
import { Canvas } from 'fabric';

@Component({
  selector: 'maker-tags-public-art-view',
  standalone: true,
  imports: [CommonModule, RouterModule, NzSpinModule, NzButtonModule, NzIconModule],
  template: `
    <div class="public-art-container">
      <div class="public-art-loading" *ngIf="isLoading">
        <nz-spin nzSimple></nz-spin>
      </div>

      <div class="public-art-content" *ngIf="!isLoading && publicArtDoc && artDoc">
        <!-- Header -->
        <div class="public-art-header">
           <a class="navbar-brand" routerLink="/">
      <img loading="lazy"  fetchpriority="high"  src="assets/logo.png" alt="Logo" height="60" />
    </a>
          <div class="seo-info">
            <h1>{{ publicArtDoc.title }}</h1>
            <p class="description" [innerHTML]="publicArtDoc.description"></p>
          </div>
        </div>

        <!-- Image Preview -->
        <div class="canvas-viewer-section">
          <div class="canvas-container">
            <div class="canvas-wrapper">
              <img loading="lazy"  fetchpriority="high"  [src]="publicArtDoc.preview_url" [alt]="publicArtDoc.title" class="preview-image">
            </div>
          </div>

          <div class="action-panel">
            <div class="action-card">
              <h3>{{ artDoc.title }}</h3>
              <p class="category-badge">{{ artDoc.categorie }}</p>
              
              <div class="action-buttons">
                <button nz-button nzType="primary" nzSize="large" (click)="editArt()">
                  <span nz-icon nzType="edit" nzTheme="outline"></span>
                  Edit This Design
                </button>
                <button nz-button nzSize="large" (click)="downloadPreview()">
                  <span nz-icon nzType="download" nzTheme="outline"></span>
                  Download Preview
                </button>
                <button nz-button nzSize="large" (click)="copyLink()">
                  <span nz-icon nzType="copy" nzTheme="outline"></span>
                  Copy Public Link
                </button>
              </div>
            </div>

            <div class="info-section">
              <h4>About this artwork</h4>
              <ul>
                <li><strong>Category:</strong> {{ artDoc.categorie }}</li>
                <li><strong>Size:</strong> {{ artDoc.width }} x {{ artDoc.height }}px</li>
              </ul>
              <p class="info-text">
                Created with <strong>MakerTags</strong>. Click "Edit This Design" to customize and download your own version!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="public-art-error" *ngIf="!isLoading && !publicArtDoc">
        <div class="error-content">
          <span nz-icon nzType="warning" nzTheme="outline"></span>
          <h2>Artwork not found</h2>
          <p>The artwork you're looking for doesn't exist or has been deleted.</p>
          <button nz-button nzType="primary" routerLink="/">
            <span nz-icon nzType="home" nzTheme="outline"></span>
            Go Home
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .public-art-container {
      min-height: 100vh;
      background: #f5f5f5;
    }

    .public-art-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .public-art-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .public-art-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .logo-section {
      margin-bottom: 20px;
    }

    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #1890ff;
      text-decoration: none;
    }

    .seo-info h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 15px 0 10px 0;
      color: #000;
    }

    .description {
      font-size: 16px;
      color: #666;
      margin: 10px 0 0 0;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .canvas-viewer-section {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 30px;
      margin-bottom: 40px;
    }

    .canvas-container {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .canvas-wrapper {
      max-width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .preview-image {
      max-width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .public-canvas {
      max-width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .action-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .action-card {
      background: white;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .action-card h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 10px 0;
      color: #000;
    }

    .category-badge {
      display: inline-block;
      background: #e6f7ff;
      color: #0050b3;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      margin: 0 0 15px 0;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .action-buttons button {
      width: 100%;
      height: 44px;
      font-size: 14px;
      font-weight: 600;
    }

    .info-section {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .info-section h4 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 15px 0;
      color: #000;
    }

    .info-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .info-section li {
      padding: 8px 0;
      font-size: 13px;
      color: #666;
      border-bottom: 1px solid #f0f0f0;
    }

    .info-section li:last-child {
      border-bottom: none;
    }

    .info-text {
      font-size: 12px;
      color: #999;
      margin: 0;
      line-height: 1.6;
    }

    .public-art-error {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .error-content {
      text-align: center;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .error-content span {
      font-size: 48px;
      color: #faad14;
      display: block;
      margin-bottom: 20px;
    }

    .error-content h2 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 10px 0;
      color: #000;
    }

    .error-content p {
      color: #666;
      font-size: 14px;
      margin: 0 0 20px 0;
    }

    .error-content button {
      min-width: 200px;
    }

    @media (max-width: 1024px) {
      .canvas-viewer-section {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .public-art-content {
        padding: 15px;
      }

      .seo-info h1 {
        font-size: 24px;
      }

      .description {
        font-size: 14px;
      }

      .action-buttons {
        flex-direction: column;
      }

      .canvas-container {
        padding: 15px;
      }

      .action-card {
        padding: 20px;
      }
    }
  `]
})
export class PublicArtViewComponent implements OnInit {
  isLoading = true;
  publicArtDoc?: IPublicArtDoc;
  artDoc?: IArtDoc;

  constructor(
    private route: ActivatedRoute,
    private publicArtService: PublicArtService,
    private artDocsService: ArtDocsService,
    private userArtDocsService: UserArtDocsService,
    private nzMessageService: NzMessageService,
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadPublicArt(slug);
      } else {
        this.isLoading = false;
      }
    });
  }

  private loadPublicArt(slug: string): void {
    this.publicArtService.getPublicArtBySlug(slug).subscribe({
      next: (publicArtDoc) => {
        this.publicArtDoc = publicArtDoc;
        // Update SEO metadata
        this.updateSeoMetadata(publicArtDoc);
        // user_art_doc_id from public_user_art_docs links to user_art_docs table
        this.loadUserArtDoc(publicArtDoc.user_art_doc_id);
      },
      error: (error) => {
        console.error('Error loading public art:', error);
        this.isLoading = false;
        this.nzMessageService.error('Failed to load artwork');
      }
    });
  }

  private updateSeoMetadata(publicArtDoc: IPublicArtDoc): void {
    // Set page title
    this.titleService.setTitle(`${publicArtDoc.title} | MakerTags`);

    // Remove existing meta tags
    this.metaService.removeTag('name="description"');
    this.metaService.removeTag('property="og:title"');
    this.metaService.removeTag('property="og:description"');
    this.metaService.removeTag('property="og:image"');
    this.metaService.removeTag('property="og:url"');
    this.metaService.removeTag('name="twitter:title"');
    this.metaService.removeTag('name="twitter:description"');
    this.metaService.removeTag('name="twitter:image"');

    // Add meta description
    this.metaService.addTag({
      name: 'description',
      content: publicArtDoc.description || 'Editable design created with MakerTags'
    });

    // Open Graph meta tags (Facebook, LinkedIn, etc.)
    this.metaService.addTag({
      property: 'og:title',
      content: publicArtDoc.title || 'MakerTags Artwork'
    });

    this.metaService.addTag({
      property: 'og:description',
      content: publicArtDoc.description || 'Editable design created with MakerTags'
    });

    this.metaService.addTag({
      property: 'og:image',
      content: publicArtDoc.preview_url || ''
    });

    this.metaService.addTag({
      property: 'og:url',
      content: window.location.href
    });

    this.metaService.addTag({
      property: 'og:type',
      content: 'website'
    });

    // Twitter Card meta tags
    this.metaService.addTag({
      name: 'twitter:card',
      content: 'summary_large_image'
    });

    this.metaService.addTag({
      name: 'twitter:title',
      content: publicArtDoc.title || 'MakerTags Artwork'
    });

    this.metaService.addTag({
      name: 'twitter:description',
      content: publicArtDoc.description || 'Editable design created with MakerTags'
    });

    this.metaService.addTag({
      name: 'twitter:image',
      content: publicArtDoc.preview_url || ''
    });
  }

  private loadUserArtDoc(userArtDocId: string): void {
    // Get user_art_doc which contains the art_docs relation
    this.userArtDocsService.getPublicUserArtDocById(userArtDocId).then((userArtDoc: any) => {
      if (userArtDoc) {
        this.artDoc = userArtDoc;
      }
      this.isLoading = false;
    }).catch((error) => {
      console.error('Error loading user art document:', error);
      this.isLoading = false;
      this.nzMessageService.error('Failed to load artwork');
    });
  }

  private renderCanvasPreview(): void {
    // No longer needed - we display image preview instead
  }

  editArt(): void {
    if (!this.artDoc?.original_id) {
      this.nzMessageService.error('Unable to open editor');
      return;
    }

    // Open the editor with the original art_docs document (not the user's copy)
    const baseUrl = window.location.origin;
    window.open(`${baseUrl}/creator/${this.artDoc.original_id}`, '_blank');
  }

  downloadPreview(): void {
    if (!this.publicArtDoc?.preview_url) {
      this.nzMessageService.error('Preview not available');
      return;
    }

    const link = document.createElement('a');
    link.href = this.publicArtDoc.preview_url;
    link.download = `${this.publicArtDoc.title || 'artwork'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  copyLink(): void {
    const baseUrl = window.location.origin;
    const publicUrl = `${baseUrl}/public-art/${this.publicArtDoc?.public_slug}`;
    
    navigator.clipboard.writeText(publicUrl).then(() => {
      this.nzMessageService.success('Public link copied to clipboard!');
    }).catch(() => {
      this.nzMessageService.error('Failed to copy link');
    });
  }
}
