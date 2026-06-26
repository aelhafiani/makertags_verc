import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Canvas, FabricObject, Textbox } from 'fabric';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { IArtDoc } from '../../../../shared/domaine/entities/art';
import { ArtFacadeService } from '../../../../shared/services/new-art.facade';
import { CanvasHistoryService } from '../../../services/canvas-history.service';
import { CanvasProviderService } from '../../../services/canvas-provider.service';
import { EditorAnnouncerService } from '../../../services/editor-announcer.service';
import { AiTextGeneratorService } from '../../../services/ai-text-generator.service';
import { buildFieldsFromCanvas, EditablePanelField } from '../edit-panel/edit-panel.types';

type PanelFormGroup = FormGroup<Record<string, FormControl<string | null>>>;

@Component({
  selector: 'maker-tags-add-text-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzInputModule, NzButtonModule, NzIconModule, NzSpinModule],
  templateUrl: './add-text-panel.component.html',
  styleUrl: './add-text-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTextPanelComponent implements OnInit, OnDestroy {
  fields: EditablePanelField[] = [];
  focusedObjectId: string | null = null;
  form: PanelFormGroup = new FormGroup<Record<string, FormControl<string | null>>>({});

  showAiSection = false;
  aiSuggestions: string[] = [];
  isGenerating = false;
  aiError: string | null = null;

  private canvas: Canvas | null = null;
  private artDoc: IArtDoc | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly formDestroy$ = new Subject<void>();

  private readonly onObjectListChanged = () => {
    this.rebuildList();
    this.cdr.markForCheck();
  };

  private readonly onCanvasTextChanged = (event: { target?: FabricObject } = {}) => {
    const target = event.target as (FabricObject & { id?: string; text?: string }) | undefined;
    const objectId = target?.id;
    const textValue = target?.text ?? '';
    if (!objectId) return;

    const field = this.fields.find((item) => item.objectId === objectId);
    if (!field) return;

    const control = this.form.controls[objectId];
    if (!control) return;

    const activeElementId = this.document.activeElement?.id;
    if (activeElementId !== objectId) {
      control.setValue(textValue, { emitEvent: false });
      field.value = textValue;
      this.cdr.markForCheck();
    }
  };

  constructor(
    private readonly canvasProvider: CanvasProviderService,
    private readonly canvasHistory: CanvasHistoryService,
    private readonly announcer: EditorAnnouncerService,
    private readonly artFacade: ArtFacadeService,
    private readonly aiTextGenerator: AiTextGeneratorService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$.pipe(takeUntil(this.destroy$)).subscribe((canvas) => {
      this.detachCanvasListeners();
      this.canvas = canvas;

      if (!canvas) {
        this.fields = [];
        this.focusedObjectId = null;
        this.formDestroy$.next();
        this.form = new FormGroup<Record<string, FormControl<string | null>>>({});
        this.cdr.markForCheck();
        return;
      }

      canvas.on('object:added', this.onObjectListChanged);
      canvas.on('object:removed', this.onObjectListChanged);
      canvas.on('object:modified', this.onCanvasTextChanged);
      canvas.on('text:changed', this.onCanvasTextChanged);
      this.rebuildList();
      this.cdr.markForCheck();
    });

    this.canvasProvider.activeObject$.pipe(takeUntil(this.destroy$)).subscribe((obj) => {
      const active = obj as (FabricObject & { id?: string }) | null;
      this.focusedObjectId = active?.id ?? null;
      this.cdr.markForCheck();
    });

    this.artFacade.artDocState$.pipe(takeUntil(this.destroy$)).subscribe((state: any) => {
      this.artDoc = state?.item ?? null;
    });
  }

  ngOnDestroy(): void {
    this.detachCanvasListeners();
    this.formDestroy$.next();
    this.formDestroy$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  addTextBox(): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();

    const textObject = new Textbox('New text', {
      fontSize: 32,
      fontFamily: 'Inter',
      fill: '#000000',
      textAlign: 'center',
      width: 200,
      left: canvasWidth / 2 - 100,
      top: canvasHeight / 2 - 20,
    });

    this.canvas.add(textObject);
    this.canvas.setActiveObject(textObject);
    this.canvas.requestRenderAll();
    this.canvasHistory.push('object:added');
    this.announcer.announce('Text box added');
  }

  async generateAiText(): Promise<void> {
    this.isGenerating = true;
    this.aiError = null;
    this.cdr.markForCheck();

    try {
      this.aiSuggestions = await this.aiTextGenerator.generateSuggestions({
        title: this.artDoc?.title,
        description: this.artDoc?.description,
        category: this.artDoc?.categorie,
      });
    } catch {
      this.aiError = 'Generation failed. Please try again.';
    } finally {
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }

  addSuggestionToCanvas(text: string): void {
    if (!this.canvas) return;

    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();

    const textObject = new Textbox(text, {
      fontSize: 28,
      fontFamily: 'Inter',
      fill: '#000000',
      textAlign: 'center',
      width: 240,
      left: w / 2 - 120,
      top: h / 2 - 40,
    });

    this.canvas.add(textObject);
    this.canvas.setActiveObject(textObject);
    this.canvas.requestRenderAll();
    this.canvasHistory.push('object:added');
    this.announcer.announce('AI text added');
  }

  onInputFocus(field: EditablePanelField): void {
    if (!this.canvas) return;

    const target = this.canvas
      .getObjects()
      .find((obj) => (obj as FabricObject & { id?: string }).id === field.objectId);

    if (target) {
      this.canvas.setActiveObject(target);
      this.canvas.requestRenderAll();
    }
  }

  onInputBlur(): void {
    if (!this.canvas) return;

    this.canvasHistory.push('text:changed');
    this.announcer.announce('Text updated');
  }

  private rebuildList(): void {
    if (!this.canvas) return;

    this.fields = buildFieldsFromCanvas(this.canvas);
    const controls: Record<string, FormControl<string | null>> = {};
    for (const field of this.fields) {
      controls[field.objectId] = new FormControl(field.value, { nonNullable: false });
    }

    this.formDestroy$.next();
    this.form = new FormGroup<Record<string, FormControl<string | null>>>(controls);
    this.cdr.markForCheck();

    this.form.valueChanges
      .pipe(debounceTime(80), takeUntil(this.formDestroy$), takeUntil(this.destroy$))
      .subscribe((valueMap) => {
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

        if (hasChanges) {
          this.canvas.requestRenderAll();
        }
      });
  }

  private detachCanvasListeners(): void {
    if (!this.canvas) return;

    this.canvas.off('object:added', this.onObjectListChanged);
    this.canvas.off('object:removed', this.onObjectListChanged);
    this.canvas.off('object:modified', this.onCanvasTextChanged);
    this.canvas.off('text:changed', this.onCanvasTextChanged);
  }
}
