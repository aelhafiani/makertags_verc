import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Canvas, FabricObject, loadSVGFromURL, util } from 'fabric';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subject, takeUntil } from 'rxjs';
import { AiDesignGeneratorService } from '../../services/ai-design-generator.service';
import { ArtDocsService } from '../../../shared/services/art-docs.service';
import { IArtDoc } from '../../../shared/domaine/entities/art';

interface ShapeModel {
  id: string;
  source: string;
  name: string;
}

type Step = 'shape' | 'upload' | 'generating' | 'preview';

@Component({
  selector: 'maker-tags-ai-design-generator',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzSpinModule],
  templateUrl: './ai-design-generator.component.html',
  styleUrl: './ai-design-generator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiDesignGeneratorComponent implements OnInit, OnDestroy {
  @Input() canvas: Canvas | null = null;
  @Input() artDoc: IArtDoc | null = null;

  step: Step = 'shape';
  isDragOver = false;
  inspirationPreview: string | null = null;
  shapeModels: ShapeModel[] = [];
  selectedShape: ShapeModel | null = null;
  loadingShapes = true;

  private imageBase64: string | null = null;
  private fabricJson: any = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: AiDesignGeneratorService,
    private readonly artDocsService: ArtDocsService,
    private readonly message: NzMessageService,
    private readonly modalRef: NzModalRef,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.artDocsService.getImagesByCategotiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assets: any[]) => {
          this.shapeModels = (assets ?? [])
            .filter((a) => (a?.categorie ?? '').toLowerCase() === 'models' && a?.source)
            .map((a) => ({
              id: String(a.id ?? a.source),
              source: a.source as string,
              name: (a.name ?? a.title ?? a.label ?? 'Modèle') as string,
            }));
          this.loadingShapes = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingShapes = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Step: shape selection ────────────────────────────────────────────────

  selectShape(shape: ShapeModel): void {
    this.selectedShape = shape;
    this.cdr.markForCheck();
  }

  goToUpload(): void {
    this.step = 'upload';
    this.cdr.markForCheck();
  }

  skipShape(): void {
    this.selectedShape = null;
    this.step = 'upload';
    this.cdr.markForCheck();
  }

  // ── Step: image upload ───────────────────────────────────────────────────

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = true;
    this.cdr.markForCheck();
  }

  onDragLeave(): void {
    this.isDragOver = false;
    this.cdr.markForCheck();
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.loadFile(file);
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.loadFile(file);
  }

  private loadFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.message.error('Veuillez sélectionner une image (JPEG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.imageBase64 = ev.target?.result as string;
      this.inspirationPreview = this.imageBase64;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  // ── Generation ───────────────────────────────────────────────────────────

  async generate(): Promise<void> {
    if (!this.imageBase64) return;

    this.step = 'generating';
    this.cdr.markForCheck();

    try {
      const w = this.canvas?.getWidth() ?? Number(this.artDoc?.width ?? 400);
      const h = this.canvas?.getHeight() ?? Number(this.artDoc?.height ?? 600);

      this.fabricJson = await this.service.generateFromInspiration(
        this.imageBase64,
        w,
        h,
        this.selectedShape?.name ?? null,
      );
      this.step = 'preview';
    } catch (err: any) {
      console.error('AI design generation error:', err);
      this.message.error('Erreur lors de la génération. Veuillez réessayer.');
      this.step = 'upload';
    }

    this.cdr.markForCheck();
  }

  // ── Apply to canvas ──────────────────────────────────────────────────────

  async applyToCanvas(): Promise<void> {
    if (!this.canvas || !this.fabricJson) return;

    try {
      this.canvas.clear();

      // 1. Apply shape model scaled to fill the canvas (margin: 8px each side)
      if (this.selectedShape) {
        await this.applyShapeToCanvas(this.selectedShape.source);
      }

      // 2. Snapshot the locked shape objects already on canvas (from step 1)
      const lockedObjects = this.canvas.getObjects().filter(
        (o) => (o as any).lockedBackground === true,
      );

      // 3. Load Claude's generated content — loadFromJSON clears the canvas first
      await this.canvas.loadFromJSON({
        version: this.fabricJson.version ?? '6.0.0',
        objects: this.fabricJson.objects ?? [],
      });

      // 4. Set background color from Claude if no shape model was used
      if (!this.selectedShape && this.fabricJson.background) {
        this.canvas.set({ backgroundColor: this.fabricJson.background });
      }

      // 5. Re-add the shape behind all content objects
      for (const obj of lockedObjects) {
        this.canvas.add(obj);
        this.canvas.sendObjectToBack(obj);
      }

      await this.ensureFonts(this.canvas);
      this.canvas.renderAll();
      this.canvas.fire('object:modified' as any);
      this.message.success('Design appliqué sur le canvas !');
      this.modalRef.close();
    } catch (err) {
      console.error('Apply to canvas error:', err);
      this.message.error("Erreur lors de l'application du design.");
    }
  }

  private async applyShapeToCanvas(svgUrl: string): Promise<void> {
    if (!this.canvas) return;

    const margin = 8;
    const canvasW = this.canvas.getWidth();
    const canvasH = this.canvas.getHeight();

    const { objects, options } = await loadSVGFromURL(svgUrl);
    const validObjects = objects.filter((o): o is FabricObject => o !== null);
    const group = util.groupSVGElements(validObjects, options);

    const naturalW = (group.width ?? 1);
    const naturalH = (group.height ?? 1);
    const scaleX = (canvasW - margin * 2) / naturalW;
    const scaleY = (canvasH - margin * 2) / naturalH;
    const scale = Math.min(scaleX, scaleY);

    group.set({
      left: canvasW / 2,
      top: canvasH / 2,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      // Lock shape so it stays in place
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
    } as any);
    (group as any).lockedBackground = true;
    (group as any).isArtContour = true;

    this.canvas.add(group);
    this.canvas.sendObjectToBack(group);
  }

  private async ensureFonts(canvas: Canvas): Promise<void> {
    const families = new Set<string>();
    (canvas.getObjects() as any[]).forEach((obj) => {
      if (obj.fontFamily) families.add(obj.fontFamily);
    });
    const systemFonts = new Set(['Arial', 'Georgia', 'Verdana', 'Courier New', 'Times New Roman']);
    const googleFamilies = [...families]
      .filter((f) => !systemFonts.has(f))
      .map((f) => f.replace(/ /g, '+'));

    if (!googleFamilies.length) return;
    const linkId = 'ai-generated-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${googleFamilies.join('&family=')}&display=swap`;
      document.head.appendChild(link);
    }
    try { await document.fonts.ready; } catch { /* non-blocking */ }
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  reset(): void {
    this.step = 'shape';
    this.imageBase64 = null;
    this.inspirationPreview = null;
    this.fabricJson = null;
    this.selectedShape = null;
    this.cdr.markForCheck();
  }

  close(): void {
    this.modalRef.close();
  }
}
