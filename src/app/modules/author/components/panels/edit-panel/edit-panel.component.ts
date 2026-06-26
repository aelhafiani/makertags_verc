import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { Canvas, FabricObject } from 'fabric';
import { CanvasProviderService } from '../../../services/canvas-provider.service';
import { CanvasHistoryService } from '../../../services/canvas-history.service';
import { EditorAnnouncerService } from '../../../services/editor-announcer.service';
import { buildFieldsFromCanvas, EditablePanelField } from './edit-panel.types';

type PanelFormGroup = FormGroup<Record<string, FormControl<string | null>>>;

@Component({
  selector: 'maker-tags-edit-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzInputModule, NzButtonModule, NzEmptyModule],
  templateUrl: './edit-panel.component.html',
  styleUrl: './edit-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPanelComponent implements OnInit, OnDestroy {
  fields: EditablePanelField[] = [];
  form: PanelFormGroup = new FormGroup<Record<string, FormControl<string | null>>>({});
  private canvas: Canvas | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly formDestroy$ = new Subject<void>();

  constructor(
    private readonly canvasProvider: CanvasProviderService,
    private readonly canvasHistory: CanvasHistoryService,
    private readonly announcer: EditorAnnouncerService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$.pipe(takeUntil(this.destroy$)).subscribe((canvas) => {
      this.canvas = canvas;
      if (!canvas) {
        this.fields = [];
        this.form = new FormGroup<Record<string, FormControl<string | null>>>({});
        this.cdr.markForCheck();
        return;
      }

      this.fields = buildFieldsFromCanvas(canvas);
      const controls: Record<string, FormControl<string | null>> = {};
      for (const field of this.fields) {
        controls[field.objectId] = new FormControl(field.value, { nonNullable: false });
      }

      // Tear down previous form subscription before replacing the form
      this.formDestroy$.next();

      this.form = new FormGroup<Record<string, FormControl<string | null>>>(controls);
      this.cdr.markForCheck();

      // Live sync: update canvas on every keystroke (debounced 80 ms)
      this.form.valueChanges
        .pipe(debounceTime(80), takeUntil(this.formDestroy$), takeUntil(this.destroy$))
        .subscribe((valueMap) => this.syncToCanvas(valueMap));
    });
  }

  /** Called on blur to push a history snapshot after the user finishes editing. */
  applyChanges(): void {
    if (!this.canvas) return;
    this.syncToCanvas(this.form.getRawValue(), true);
  }

  private syncToCanvas(
    valueMap: Partial<Record<string, string | null>>,
    pushHistory = false
  ): void {
    if (!this.canvas) return;

    let hasChanges = false;
    for (const field of this.fields) {
      const nextValue = (valueMap[field.objectId] ?? '').toString();
      if (nextValue === field.value) continue;

      const target = this.canvas
        .getObjects()
        .find((obj) => (obj as FabricObject & { id?: string }).id === field.objectId) as
        | (FabricObject & { text?: string })
        | undefined;

      if (target) {
        target.set('text', nextValue);
        field.value = nextValue;
        hasChanges = true;
      }
    }

    if (!hasChanges) return;

    this.canvas.requestRenderAll();
    this.canvas.fire('object:modified' as any);
    if (pushHistory) {
      this.canvasHistory.push('text:changed');
      this.announcer.announce('Text fields updated');
    }
  }

  ngOnDestroy(): void {
    this.formDestroy$.next();
    this.formDestroy$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
}

