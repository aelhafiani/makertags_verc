import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Canvas } from 'fabric';
import { MockupGeneratorService, MockupRatio, MockupType } from '../../services/mockup-generator.service';
import { IArtDoc } from '../../../shared/domaine/entities/art';

@Component({
  selector: 'maker-tags-mockup-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule, NzButtonModule, NzSelectModule, NzSpinModule],
  templateUrl: './mockup-generator.component.html',
  styleUrl: './mockup-generator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MockupGeneratorComponent implements OnInit {
  @Input() canvas: Canvas | null = null;
  @Input() artDoc: IArtDoc | null = null;

  readonly mockupTypeOptions: { label: string; value: MockupType; description: string }[] = [
    { label: 'Gift Tag', value: 'gift-tag', description: 'Lifestyle photo with tag on a wrapped gift' },
    { label: 'Cut-Die Card', value: 'cut-die-card', description: 'Foldable die-cut flower card product scene' },
  ];

  readonly ratioOptions: { label: string; value: MockupRatio }[] = [
    { label: '2:3  (1000×1500) — Pinterest', value: '2:3' },
    { label: '9:16 (1080×1920) — Story',     value: '9:16' },
    { label: '4:5  (1000×1250) — Instagram',  value: '4:5' },
    { label: '1:1  (1024×1024) — Square',     value: '1:1' },
  ];

  selectedMockupType: MockupType = 'gift-tag';
  selectedRatio: MockupRatio = '2:3';
  loading = false;
  resultUrl: string | null = null;
  usedPrompt: string | null = null;

  title = '';
  subtitle = '';

  openedCardBase64: string | null = null;
  openedCardPreview: string | null = null;

  constructor(
    private readonly service: MockupGeneratorService,
    private readonly message: NzMessageService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.canvas) {
      const texts = this.service.extractTextsFromCanvas(this.canvas);
      this.title = texts.title;
      this.subtitle = texts.subtitle;
    }
  }

  get isCutDieCard(): boolean {
    return this.selectedMockupType === 'cut-die-card';
  }

  selectMockupType(type: MockupType): void {
    this.selectedMockupType = type;
    if (type === 'cut-die-card') {
      this.selectedRatio = '9:16';
    }
    this.openedCardBase64 = null;
    this.openedCardPreview = null;
  }

  onOpenedCardFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.openedCardBase64 = reader.result as string;
      this.openedCardPreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  removeOpenedCard(): void {
    this.openedCardBase64 = null;
    this.openedCardPreview = null;
    this.cdr.markForCheck();
  }

  get canvasPreview(): string {
    return this.canvas ? this.service.exportCanvasToBase64(this.canvas) : '';
  }

  async generate(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.resultUrl = null;
    this.cdr.markForCheck();

    try {
      const occasion = this.artDoc?.title ?? this.artDoc?.name ?? '';
      const canvasImageBase64 = this.canvas
        ? this.service.exportCanvasToBase64(this.canvas)
        : '';
      const result = await this.service.generate({
        ratio: this.selectedRatio,
        occasion,
        title: this.title,
        subtitle: this.subtitle,
        canvasImageBase64,
        mockupType: this.selectedMockupType,
        openedCardBase64: this.openedCardBase64 ?? undefined,
      });
      this.resultUrl = result.imageUrl;
      this.usedPrompt = result.prompt;
    } catch (err: any) {
      console.error('[mockup] generation error:', err);
      const detail = err?.message ?? String(err);
      this.message.error(`Mockup failed: ${detail}`);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  download(): void {
    if (!this.resultUrl) return;
    const a = document.createElement('a');
    a.href = this.resultUrl;
    a.download = `mockup-${this.selectedRatio.replace(':', 'x')}.jpg`;
    a.target = '_blank';
    a.click();
  }

  regenerate(): void {
    this.resultUrl = null;
    this.generate();
  }
}
