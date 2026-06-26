import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ActiveSelection, Canvas, FabricObject } from 'fabric';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CanvasProviderService } from '../../../services/canvas-provider.service';
import { CanvasHistoryService } from '../../../services/canvas-history.service';
import { SnapGuidesService } from '../../../services/snap-guides.service';

export type AlignDirection = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';

@Component({
  selector: 'maker-tags-floating-alignment-toolbar',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './floating-alignment-toolbar.component.html',
  styleUrl: './floating-alignment-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingAlignmentToolbarComponent implements OnInit, OnDestroy {
  visible = false;

  private canvas: Canvas | null = null;
  private activeSelection: ActiveSelection | null = null;
  private readonly destroy$ = new Subject<void>();

  get guidesEnabled(): boolean { return this.snapGuides.isEnabled; }

  constructor(
    private readonly canvasProvider: CanvasProviderService,
    private readonly canvasHistory: CanvasHistoryService,
    private readonly snapGuides: SnapGuidesService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canvas => { this.canvas = canvas; });

    this.canvasProvider.activeObject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(obj => {
        if (obj && obj.type === 'activeselection') {
          this.activeSelection = obj as ActiveSelection;
          this.visible = true;
        } else {
          this.activeSelection = null;
          this.visible = false;
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  align(direction: AlignDirection): void {
    if (!this.canvas || !this.activeSelection) return;

    const sel = this.activeSelection;
    const objects = this.canvas.getActiveObjects();
    const selW = sel.width;
    const selH = sel.height;

    objects.forEach((obj: FabricObject) => {
      switch (direction) {
        case 'left':
          obj.set({ left: -selW / 2 + obj.getScaledWidth() / 2 });
          break;
        case 'centerH':
          obj.set({ left: 0 });
          break;
        case 'right':
          obj.set({ left: selW / 2 - obj.getScaledWidth() / 2 });
          break;
        case 'top':
          obj.set({ top: -selH / 2 + obj.getScaledHeight() / 2 });
          break;
        case 'centerV':
          obj.set({ top: 0 });
          break;
        case 'bottom':
          obj.set({ top: selH / 2 - obj.getScaledHeight() / 2 });
          break;
      }
      obj.setCoords();
    });

    sel.setCoords();
    this.canvas.renderAll();
    this.canvasHistory.push('object:modified');
  }

  toggleGuides(): void {
    this.snapGuides.setEnabled(!this.snapGuides.isEnabled);
    this.cdr.markForCheck();
  }

  close(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }
}
