import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Canvas, FabricImage } from 'fabric';
import { nanoid } from 'nanoid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';
import { CanvasProviderService } from '../../../services/canvas-provider.service';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

@Component({
  selector: 'maker-tags-qrcode-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule],
  templateUrl: './qrcode-panel.component.html',
  styleUrl: './qrcode-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrcodePanelComponent implements OnInit, OnDestroy {
  qrData = '';
  qrSize = 200;
  loading = false;
  previewUrl: string | null = null;

  private canvas: Canvas | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly canvasProvider: CanvasProviderService,
    private readonly message: NzMessageService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canvas => { this.canvas = canvas; });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildQrUrl(data: string, size: number): string {
    const encoded = encodeURIComponent(data.trim() || 'https://makertags.com');
    return `${QR_API}?size=${size}x${size}&data=${encoded}&format=png&margin=1`;
  }

  onDataChange(): void {
    if (!this.qrData.trim()) {
      this.previewUrl = null;
      this.cdr.markForCheck();
      return;
    }
    this.previewUrl = this.buildQrUrl(this.qrData, 150);
    this.cdr.markForCheck();
  }

  async addToCanvas(): Promise<void> {
    if (!this.canvas) return;
    if (!this.qrData.trim()) {
      this.message.warning('Entrez une URL ou un texte pour le QR Code');
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    try {
      const url = this.buildQrUrl(this.qrData, this.qrSize);
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

      const id = nanoid();
      (img as any).id = id;
      (img as any).qrData = this.qrData;

      const canvasW = this.canvas.getWidth();
      const canvasH = this.canvas.getHeight();
      img.set({
        left: canvasW / 2 - this.qrSize / 2,
        top: canvasH / 2 - this.qrSize / 2,
        scaleX: 1,
        scaleY: 1,
      });

      this.canvas.add(img);
      this.canvas.setActiveObject(img);
      this.canvas.renderAll();
      this.message.success('QR Code ajouté au canvas');
    } catch {
      this.message.error('Impossible de générer le QR Code');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
