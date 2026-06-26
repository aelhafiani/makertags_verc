import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Canvas, FabricImage, FabricObject, loadSVGFromURL, util } from 'fabric';
import { nanoid } from 'nanoid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subject, takeUntil } from 'rxjs';
import { IArtDoc } from '../../../../shared/domaine/entities/art';
import { ArtFacadeService } from '../../../../shared/services/new-art.facade';
import { CanvasProviderService } from '../../../services/canvas-provider.service';
import { EditorAnnouncerService } from '../../../services/editor-announcer.service';
import {
  ImageUploadNetworkError,
  ImageUploadService,
  ImageUploadValidationError,
  UploadedImageRef,
} from '../../../services/image-upload.service';
import { AiImageGeneratorService } from '../../../services/ai-image-generator.service';
import { StickerService, StickerOutlineColor } from '../../../services/sticker.service';

type UploadedCanvasImage = FabricObject & {
  id?: string;
  uploadedImagePath?: string;
  uploadedImageUrl?: string;
  getSrc?: () => string;
};

@Component({
  selector: 'maker-tags-add-image-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzEmptyModule, NzIconModule, NzSpinModule],
  templateUrl: './add-image-panel.component.html',
  styleUrl: './add-image-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddImagePanelComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') private readonly fileInputRef?: ElementRef<HTMLInputElement>;

  uploads: UploadedImageRef[] = [];
  loading = true;
  uploading = false;
  dragActive = false;
  errorMessage: string | null = null;
  deletingPath: string | null = null;

  showAiSection = false;
  aiPrompt = '';
  aiImages: string[] = [];
  isGenerating = false;
  aiError: string | null = null;

  showStickerSection = false;
  stickerLoading: Record<string, StickerOutlineColor | null> = {};
  stickerError: string | null = null;
  stickerWhiteWidth = 16;
  stickerBlackWidth = 8;

  private canvas: Canvas | null = null;
  private artDoc: IArtDoc | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly imageUploadService: ImageUploadService,
    private readonly canvasProvider: CanvasProviderService,
    private readonly announcer: EditorAnnouncerService,
    private readonly artFacade: ArtFacadeService,
    private readonly aiImageGenerator: AiImageGeneratorService,
    private readonly stickerService: StickerService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$.pipe(takeUntil(this.destroy$)).subscribe((canvas) => {
      this.canvas = canvas;
    });

    this.artFacade.artDocState$.pipe(takeUntil(this.destroy$)).subscribe((state: any) => {
      this.artDoc = state?.item ?? null;
    });

    void this.loadUploads();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleAiSection(): void {
    this.showAiSection = !this.showAiSection;
    if (this.showAiSection && !this.aiPrompt) {
      this.aiPrompt = this.aiImageGenerator.buildPrompt({
        title: this.artDoc?.title,
        description: this.artDoc?.description,
        category: this.artDoc?.categorie,
      });
      this.cdr.markForCheck();
    }
  }

  async generateAiImages(): Promise<void> {
    const prompt = this.aiPrompt.trim();
    if (!prompt) return;

    this.isGenerating = true;
    this.aiError = null;
    this.cdr.markForCheck();

    try {
      this.aiImages = await this.aiImageGenerator.generateImages(prompt);
    } catch {
      this.aiError = 'Generation failed. Please try again.';
    } finally {
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }

  async placeAiImage(url: string): Promise<void> {
    if (!this.canvas) return;

    this.aiError = null;
    this.cdr.markForCheck();

    try {
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();
      const maxDim = Math.min(canvasWidth, canvasHeight) * 0.5;

      const obj = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
      const objWidth = obj.width ?? maxDim;
      const objHeight = obj.height ?? maxDim;
      const finalScale = Math.min(maxDim / objWidth, maxDim / objHeight, 1);

      obj.set({
        id: nanoid(),
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        scaleX: finalScale,
        scaleY: finalScale,
      });

      this.canvas.add(obj);
      this.canvas.viewportCenterObject(obj);
      this.canvas.setActiveObject(obj);
      this.canvas.requestRenderAll();
      this.announcer.announce('AI image added to canvas');
    } catch {
      this.aiError = 'Could not place this image on the canvas.';
      this.cdr.markForCheck();
    }
  }

  toggleStickerSection(): void {
    this.showStickerSection = !this.showStickerSection;
  }

  isStickerLoading(path: string): boolean {
    return this.stickerLoading[path] != null;
  }

  async makeSticker(ref: UploadedImageRef, color: StickerOutlineColor): Promise<void> {
    if (!this.canvas || this.stickerLoading[ref.path]) return;

    this.stickerLoading = { ...this.stickerLoading, [ref.path]: color };
    this.stickerError = null;
    this.cdr.markForCheck();

    try {
      let dataUrl: string;
      if (color === 'double') {
        dataUrl = await this.stickerService.createDoubleSticker(ref.url, {
          outlineWidth: this.stickerWhiteWidth + this.stickerBlackWidth,
          whiteWidth: this.stickerWhiteWidth,
          blackWidth: this.stickerBlackWidth,
        });
      } else if (color === 'white') {
        dataUrl = await this.stickerService.createSticker(ref.url, 'white', { outlineWidth: this.stickerWhiteWidth });
      } else {
        dataUrl = await this.stickerService.createSticker(ref.url, 'black', { outlineWidth: this.stickerBlackWidth });
      }

      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();
      const maxDim = Math.min(canvasWidth, canvasHeight) * 0.6;

      const img = await FabricImage.fromURL(dataUrl);
      const imgWidth = img.width ?? maxDim;
      const imgHeight = img.height ?? maxDim;
      const finalScale = Math.min(maxDim / imgWidth, maxDim / imgHeight, 1);

      img.set({
        id: nanoid(),
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        scaleX: finalScale,
        scaleY: finalScale,
      });

      this.canvas.add(img);
      this.canvas.viewportCenterObject(img);
      this.canvas.setActiveObject(img);
      this.canvas.requestRenderAll();
      this.announcer.announce(`Sticker added to canvas`);
    } catch {
      this.stickerError = 'Could not generate sticker. The image may not support cross-origin access.';
      this.cdr.markForCheck();
    } finally {
      const updated = { ...this.stickerLoading };
      delete updated[ref.path];
      this.stickerLoading = updated;
      this.cdr.markForCheck();
    }
  }

  openFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    void this.uploadFile(file).finally(() => {
      if (input) {
        input.value = '';
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    const relatedTarget = event.relatedTarget as Node | null;
    const currentTarget = event.currentTarget as Node | null;
    if (relatedTarget && currentTarget?.contains(relatedTarget)) {
      return;
    }

    this.dragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;

    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    void this.uploadFile(file);
  }

  async placeImage(ref: UploadedImageRef): Promise<void> {
    if (!this.canvas) {
      this.errorMessage = 'Canvas is not ready yet.';
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();
      const maxDim = Math.min(canvasWidth, canvasHeight) * 0.5;
      const isSvg = ref.mimeType === 'image/svg+xml' || ref.url.toLowerCase().endsWith('.svg');

      let obj: FabricObject;

      if (isSvg) {
        // loadSVGFromURL parses the SVG XML directly — avoids the drawImage crop issue
        // that occurs when loading SVGs via <img> tag with FabricImage.fromURL.
        const { objects, options } = await loadSVGFromURL(ref.url);
        const validObjects = objects.filter((o): o is FabricObject => o !== null);
        if (validObjects.length > 0) {
          const group = util.groupSVGElements(validObjects, options);
          // Clear any background color carried over from SVG root element metadata
          group.set({ backgroundColor: '' });
          obj = group;
        } else {
          obj = await FabricImage.fromURL(ref.url, { crossOrigin: 'anonymous' });
        }
      } else {
        obj = await FabricImage.fromURL(ref.url, { crossOrigin: 'anonymous' });
      }

      const objWidth = obj.width ?? maxDim;
      const objHeight = obj.height ?? maxDim;
      const finalScale = Math.min(maxDim / objWidth, maxDim / objHeight, 1);

      obj.set({
        id: nanoid(),
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        uploadedImagePath: ref.path,
        uploadedImageUrl: ref.url,
        scaleX: finalScale,
        scaleY: finalScale,
      } as Partial<UploadedCanvasImage>);

      const objWithMeta = obj as unknown as UploadedCanvasImage & {
        toObject: (propertiesToInclude?: unknown[]) => Record<string, unknown>;
      };
      const originalToObject = objWithMeta.toObject.bind(objWithMeta);
      objWithMeta.toObject = (propertiesToInclude?: unknown[]) =>
        originalToObject([...(propertiesToInclude ?? []), 'uploadedImagePath', 'uploadedImageUrl']);

      this.canvas.add(obj);
      this.canvas.viewportCenterObject(obj);
      this.canvas.setActiveObject(obj);
      this.canvas.requestRenderAll();
      this.announcer.announce('Image added to canvas');
    } catch {
      this.errorMessage = 'Could not place this image on the canvas.';
      this.cdr.markForCheck();
    }
  }

  async removeImage(ref: UploadedImageRef, event?: Event): Promise<void> {
    event?.stopPropagation();
    this.deletingPath = ref.path;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      await this.imageUploadService.remove(ref);
      this.removeImageFromCanvas(ref);
      this.uploads = this.uploads.filter((item) => item.path !== ref.path);
    } catch {
      this.errorMessage = 'Could not remove this image.';
    } finally {
      this.deletingPath = null;
      this.cdr.markForCheck();
    }
  }

  trackUpload(_index: number, image: UploadedImageRef): string {
    return image.path;
  }

  private async loadUploads(): Promise<void> {
    this.loading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      this.uploads = await this.imageUploadService.listUserUploads();
    } catch {
      this.errorMessage = 'Could not load your uploaded images.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private async uploadFile(file: File): Promise<void> {
    this.uploading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const uploaded = await this.imageUploadService.upload(file);
      this.uploads = [uploaded, ...this.uploads];
      this.announcer.announce('Image uploaded');
    } catch (error) {
      if (error instanceof ImageUploadValidationError) {
        this.errorMessage = error.message;
      } else if (error instanceof ImageUploadNetworkError) {
        this.errorMessage = 'Upload failed, please retry';
      } else {
        this.errorMessage = 'Upload failed, please retry';
      }
    } finally {
      this.uploading = false;
      this.cdr.markForCheck();
    }
  }

  private removeImageFromCanvas(ref: UploadedImageRef): void {
    if (!this.canvas) {
      return;
    }

    const matchingObjects = this.canvas.getObjects().filter((object) => {
      const imageObject = object as UploadedCanvasImage;
      const objectSrc = imageObject.getSrc?.() ?? (object as any).src ?? null;
      return imageObject.uploadedImagePath === ref.path || objectSrc === ref.url;
    });

    if (matchingObjects.length === 0) {
      return;
    }

    const activeObject = this.canvas.getActiveObject() as UploadedCanvasImage | null;
    if (activeObject && matchingObjects.includes(activeObject)) {
      this.canvas.discardActiveObject();
    }

    matchingObjects.forEach((object) => this.canvas?.remove(object));
    this.canvas.requestRenderAll();
    this.announcer.announce('Image removed from uploads and canvas');
  }
}
