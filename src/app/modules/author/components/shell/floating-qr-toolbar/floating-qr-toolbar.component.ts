import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Canvas, FabricImage, FabricObject } from 'fabric';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';
import { CanvasProviderService } from '../../../services/canvas-provider.service';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

type QrFabricImage = FabricImage & { qrData?: string; id?: string };

@Component({
  selector: 'maker-tags-floating-qr-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule],
  templateUrl: './floating-qr-toolbar.component.html',
  styleUrl: './floating-qr-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingQrToolbarComponent implements OnInit, OnDestroy {
  visible = false;
  qrData = '';
  loading = false;

  private canvas: Canvas | null = null;
  private activeQr: QrFabricImage | null = null;
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

    this.canvasProvider.activeObject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(obj => {
        const qrObj = obj as QrFabricImage | null;
        if (qrObj && qrObj.type === 'image' && qrObj.qrData !== undefined) {
          this.activeQr = qrObj;
          this.qrData = qrObj.qrData ?? '';
          this.visible = true;
        } else {
          this.activeQr = null;
          this.visible = false;
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async updateQr(): Promise<void> {
    if (!this.canvas || !this.activeQr || !this.qrData.trim()) return;

    this.loading = true;
    this.cdr.markForCheck();

    try {
      const size = Math.round((this.activeQr.width ?? 200) * (this.activeQr.scaleX ?? 1));
      const encoded = encodeURIComponent(this.qrData.trim());
      const url = `${QR_API}?size=${size}x${size}&data=${encoded}&format=png&margin=1`;

      // Load new QR image
      const newImg = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

      // Preserve position, scale, angle and custom props from old object
      const old = this.activeQr;
      newImg.set({
        left: old.left,
        top: old.top,
        scaleX: old.scaleX,
        scaleY: old.scaleY,
        angle: old.angle,
        originX: old.originX,
        originY: old.originY,
      });
      (newImg as any).id = (old as any).id;
      (newImg as any).qrData = this.qrData.trim();

      this.canvas.remove(old);
      this.canvas.add(newImg);
      this.canvas.setActiveObject(newImg);
      this.canvas.renderAll();

      this.activeQr = newImg as QrFabricImage;
      this.message.success('QR Code mis à jour');
    } catch {
      this.message.error('Impossible de mettre à jour le QR Code');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  deleteQr(): void {
    if (!this.canvas || !this.activeQr) return;
    this.canvas.remove(this.activeQr as FabricObject);
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  close(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }
}
