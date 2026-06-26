import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface IShareAction {
  action: 'export' | 'public';
  options?: any;
}

@Component({
  selector: 'maker-tags-share-options',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
  template: `
    <div class="share-options-container">
      <h3>Share Your Artwork</h3>
      <p class="subtitle">Choose how you want to share your creation</p>

      <div class="options-grid">
        <div class="option-card" (click)="selectExport()">
          <div class="option-icon">
            <span nz-icon nzType="download" nzTheme="outline"></span>
          </div>
          <div class="option-content">
            <h4>Download & Export</h4>
            <p>Export your artwork as PDF, PNG, or JPEG</p>
          </div>
          <span class="arrow" nz-icon nzType="right"></span>
        </div>

        <div class="option-card" (click)="selectPublicLink()">
          <div class="option-icon">
            <span nz-icon nzType="link" nzTheme="outline"></span>
          </div>
          <div class="option-content">
            <h4>Create Public Link</h4>
            <p>Generate a shareable link with preview image</p>
          </div>
          <span class="arrow" nz-icon nzType="right"></span>
        </div>
      </div>

      <div class="info-box">
        <span nz-icon nzType="info-circle" nzTheme="outline"></span>
        <p>Public links allow others to view and edit your artwork</p>
      </div>
    </div>
  `,
  styles: [`
    .share-options-container {
      padding: 20px;
      text-align: center;
    }

    h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
      font-weight: 600;
      color: #000;
    }

    .subtitle {
      color: #666;
      font-size: 13px;
      margin: 0 0 25px 0;
    }

    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .option-card {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #f9f9f9;
    }

    .option-card:hover {
      border-color: #1890ff;
      background: #f0f5ff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .option-icon {
      font-size: 32px;
      color: #1890ff;
      flex-shrink: 0;
    }

    .option-content {
      flex: 1;
      text-align: left;
    }

    .option-content h4 {
      margin: 0 0 5px 0;
      font-size: 14px;
      font-weight: 600;
      color: #000;
    }

    .option-content p {
      margin: 0;
      font-size: 12px;
      color: #999;
    }

    .arrow {
      font-size: 16px;
      color: #999;
      flex-shrink: 0;
    }

    .info-box {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px;
      background: #e6f7ff;
      border-radius: 4px;
      font-size: 12px;
      color: #0050b3;
    }

    .info-box span {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-box p {
      margin: 0;
    }

    @media (max-width: 768px) {
      .share-options-container {
        padding: 15px;
      }

      .option-card {
        flex-direction: column;
        text-align: center;
      }

      .option-content {
        text-align: center;
      }

      .arrow {
        display: none;
      }
    }
  `]
})
export class ShareOptionsComponent {
  @Output() shareAction = new EventEmitter<IShareAction>();

  selectExport(): void {
    this.shareAction.emit({ action: 'export' });
  }

  selectPublicLink(): void {
    this.shareAction.emit({ action: 'public' });
  }
}
