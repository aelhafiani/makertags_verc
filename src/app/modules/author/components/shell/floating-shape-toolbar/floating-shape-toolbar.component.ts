import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Canvas, FabricObject, Group } from 'fabric';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CanvasProviderService } from '../../../services/canvas-provider.service';
import { CanvasHistoryService } from '../../../services/canvas-history.service';

const TEXT_TYPES = new Set(['i-text', 'textbox', 'text']);

@Component({
  selector: 'maker-tags-floating-shape-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule],
  templateUrl: './floating-shape-toolbar.component.html',
  styleUrl: './floating-shape-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingShapeToolbarComponent implements OnInit, OnDestroy {
  visible = false;
  /** true when the selected object supports fill/stroke editing (shapes & SVG groups) */
  isColorable = false;

  fill = '#f59e0b';
  stroke = '#000000';
  strokeWidth = 0;
  strokeStyle: 'solid' | 'dashed' | 'dotted' = 'solid';
  opacity = 100; // 0–100 %, maps to Fabric opacity 0–1

  private readonly strokeSteps = [0, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];

  private activeObject: FabricObject | null = null;
  private canvas: Canvas | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly canvasProvider: CanvasProviderService,
    private readonly canvasHistory: CanvasHistoryService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canvas => { this.canvas = canvas; });

    this.canvasProvider.activeObject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(obj => {
        const isQr = obj && (obj as any)['qrData'] !== undefined;
        if (obj && !TEXT_TYPES.has(obj.type ?? '') && !isQr && obj.type !== 'activeselection') {
          this.activeObject = obj;
          this.isColorable = obj.type !== 'image';
          this.readFromObject(obj);
          this.visible = true;
        } else {
          this.activeObject = null;
          this.visible = false;
          this.isColorable = false;
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFillChange(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.fill = color;
    this.applyFill(color);
    this.cdr.markForCheck();
  }

  onStrokeChange(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.stroke = color;
    this.applyStroke(color, this.strokeWidth);
    this.cdr.markForCheck();
  }

  decreaseStrokeWidth(): void {
    const idx = this.currentStepIndex();
    if (idx <= 0) return;
    this.strokeWidth = this.strokeSteps[idx - 1];
    this.applyStroke(this.stroke, this.strokeWidth);
    this.cdr.markForCheck();
  }

  increaseStrokeWidth(): void {
    const idx = this.currentStepIndex();
    if (idx >= this.strokeSteps.length - 1) return;
    this.strokeWidth = this.strokeSteps[idx + 1];
    this.applyStroke(this.stroke, this.strokeWidth);
    this.cdr.markForCheck();
  }

  onStrokeWidthInput(value: string): void {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) return;
    this.strokeWidth = parsed;
    this.applyStroke(this.stroke, this.strokeWidth);
    this.cdr.markForCheck();
  }

  private currentStepIndex(): number {
    const exact = this.strokeSteps.indexOf(this.strokeWidth);
    if (exact !== -1) return exact;
    // find closest
    let closest = 0;
    let minDiff = Infinity;
    this.strokeSteps.forEach((s, i) => {
      const diff = Math.abs(s - this.strokeWidth);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    });
    return closest;
  }

  deleteObject(): void {
    if (!this.activeObject || !this.canvas) return;
    this.canvas.remove(this.activeObject);
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.canvasHistory.push('object:removed');
  }

  close(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  setStrokeStyle(style: 'solid' | 'dashed' | 'dotted'): void {
    this.strokeStyle = style;
    const dashArray = style === 'dashed' ? [10, 5] : style === 'dotted' ? [2, 4] : [];
    if (!this.activeObject || !this.canvas) return;
    if (this.activeObject.type === 'group') {
      (this.activeObject as Group).getObjects().forEach((child: FabricObject) => {
        child.set({ strokeDashArray: dashArray });
      });
    }
    this.activeObject.set({ strokeDashArray: dashArray });
    this.canvas.renderAll();
    this.canvasHistory.push('object:modified');
    this.cdr.markForCheck();
  }

  onOpacityChange(value: string): void {
    this.opacity = Math.min(100, Math.max(0, Number(value)));
    if (!this.activeObject || !this.canvas) return;
    this.activeObject.set({ opacity: this.opacity / 100 });
    this.canvas.renderAll();
    this.canvasHistory.push('object:modified');
    this.cdr.markForCheck();
  }

  private readFromObject(obj: FabricObject): void {
    if (obj.type === 'group') {
      const group = obj as Group;
      const firstColored = (group.getObjects() as FabricObject[]).find(
        (c) => c.fill && c.fill !== '' && c.fill !== 'transparent'
      );
      this.fill = this.toHex((firstColored?.fill as string) ?? (obj.fill as string) ?? '#cccccc');
    } else {
      this.fill = this.toHex((obj.fill as string) ?? '#cccccc');
    }
    this.opacity = Math.round(((obj.opacity ?? 1) as number) * 100);
    this.strokeWidth = (obj.strokeWidth as number) ?? 0;
    this.stroke = this.toHex((obj.stroke as string) || '#000000');
    const dash = (obj.strokeDashArray as number[] | undefined) ?? [];
    if (dash.length >= 2 && dash[0] >= 8) this.strokeStyle = 'dashed';
    else if (dash.length >= 2 && dash[0] <= 3) this.strokeStyle = 'dotted';
    else this.strokeStyle = 'solid';
  }

  private applyFill(color: string): void {
    if (!this.activeObject || !this.canvas) return;

    // Set fill on the object itself (works for shapes + simple SVG groups)
    this.activeObject.set({ fill: color });

    // Also propagate to children for multi-path SVG groups
    if (this.activeObject.type === 'group') {
      (this.activeObject as Group).getObjects().forEach((child: FabricObject) => {
        const f = child.fill as string | undefined;
        if (f && f !== 'transparent' && f !== 'none' && f !== '') {
          child.set({ fill: color });
        }
      });
    }

    this.canvas.renderAll();
    this.canvasHistory.push('object:modified');
  }

  private applyStroke(color: string, width: number): void {
    if (!this.activeObject || !this.canvas) return;

    if (this.activeObject.type === 'group') {
      const group = this.activeObject as Group;
      (group.getObjects() as FabricObject[]).forEach((child) => {
        child.set({ stroke: color, strokeWidth: width });
      });
    }
    this.activeObject.set({ stroke: color, strokeWidth: width });
    this.canvas.renderAll();
    this.canvasHistory.push('object:modified');
  }

  private toHex(fill: string | null | undefined): string {
    if (!fill || typeof fill !== 'string') return '#cccccc';
    if (fill.startsWith('#')) {
      return fill.length === 4
        ? '#' + fill.slice(1).split('').map(c => c + c).join('')
        : fill.slice(0, 7);
    }
    const m = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }
    return '#cccccc';
  }
}
