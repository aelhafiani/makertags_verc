import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Canvas, FabricObject } from 'fabric';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CanvasProviderService } from '../../../services/canvas-provider.service';

interface FabricTextObj extends FabricObject {
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: string;
  fill: string | null;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
}

const FONTS: { key: string; label: string; category: string }[] = [
  { key: 'Inter',              label: 'Inter',              category: 'Sans' },
  { key: 'Montserrat',         label: 'Montserrat',         category: 'Sans' },
  { key: 'Poppins',            label: 'Poppins',            category: 'Sans' },
  { key: 'Raleway',            label: 'Raleway',            category: 'Sans' },
  { key: 'Lato',               label: 'Lato',               category: 'Sans' },
  { key: 'Nunito',             label: 'Nunito',             category: 'Sans' },
  { key: 'Josefin Sans',       label: 'Josefin Sans',       category: 'Sans' },
  { key: 'Oswald',             label: 'Oswald',             category: 'Sans' },
  { key: 'Bebas Neue',         label: 'Bebas Neue',         category: 'Sans' },
  { key: 'Cairo',              label: 'Cairo',              category: 'Sans' },
  { key: 'Playfair Display',   label: 'Playfair Display',   category: 'Serif' },
  { key: 'Lora',               label: 'Lora',               category: 'Serif' },
  { key: 'Merriweather',       label: 'Merriweather',       category: 'Serif' },
  { key: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Serif' },
  { key: 'Georgia',            label: 'Georgia',            category: 'Serif' },
  { key: 'Dancing Script',     label: 'Dancing Script',     category: 'Déco' },
  { key: 'Pinyon Script',      label: 'Pinyon Script',      category: 'Déco' },
  { key: 'Pacifico',           label: 'Pacifico',           category: 'Déco' },
  { key: 'Paprika',            label: 'Paprika',            category: 'Déco' },
  { key: 'Praise',             label: 'Praise',             category: 'Déco' },
  { key: 'Cookie',             label: 'Cookie',             category: 'Déco' },
  { key: 'Rochester',          label: 'Rochester',          category: 'Déco' },
  { key: 'Abril Fatface',      label: 'Abril Fatface',      category: 'Déco' },
  { key: 'Courier New',        label: 'Courier New',        category: 'Déco' },
  { key: 'Belleza',            label: 'Belleza',            category: 'Mode' },
  { key: 'Elsie',              label: 'Elsie',              category: 'Mode' },
  { key: 'Yeseva One',         label: 'Yeseva One',         category: 'Mode' },
  { key: 'Simonetta',          label: 'Simonetta',          category: 'Mode' },
  { key: 'Madimi One',         label: 'Madimi One',         category: 'Mode' },
];

const GOOGLE_FONTS = FONTS.filter(f => f.key !== 'Georgia' && f.key !== 'Courier New');

@Component({
  selector: 'maker-tags-floating-text-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule],
  templateUrl: './floating-text-toolbar.component.html',
  styleUrl: './floating-text-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingTextToolbarComponent implements OnInit, OnDestroy {
  // ── Visibility ─────────────────────────────────────────────────────────────
  visible = false;

  // ── Text state (mirrors active fabric text object) ─────────────────────────
  fontSize = 24;
  fontFamily = 'Inter';
  fontWeight: string | number = 'normal';
  fontStyle = 'normal';
  fill = '#000000';
  textAlign = 'left';

  lineHeight = 1.16;
  charSpacing = 0;

  // ── Dropdown toggles ───────────────────────────────────────────────────────
  showFontPicker = false;
  showAlignMenu = false;
  showSpacingPanel = false;

  // ── Font list ──────────────────────────────────────────────────────────────
  readonly fonts = FONTS;
  readonly categories = [...new Set(FONTS.map(f => f.category))];

  private readonly destroy$ = new Subject<void>();
  private activeObject: FabricTextObj | null = null;
  private canvas: Canvas | null = null;

  constructor(
    private readonly canvasProvider: CanvasProviderService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private readonly doc: Document,
  ) {}

  ngOnInit(): void {
    this.loadGoogleFonts();

    this.canvasProvider.canvas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canvas => { this.canvas = canvas; });

    this.canvasProvider.activeObject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(obj => {
        if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
          this.activeObject = obj as FabricTextObj;
          this.readFromObject(this.activeObject);
          this.visible = true;
        } else {
          this.activeObject = null;
          this.visible = false;
          this.showFontPicker = false;
          this.showAlignMenu = false;
          this.showSpacingPanel = false;
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed helpers ───────────────────────────────────────────────────────
  get isBold(): boolean {
    return this.fontWeight === 'bold' || this.fontWeight === 700;
  }

  get isItalic(): boolean {
    return this.fontStyle === 'italic';
  }

  alignIcon(): string {
    const map: Record<string, string> = {
      left: 'align-left',
      center: 'align-center',
      right: 'align-right',
    };
    return map[this.textAlign] ?? 'align-left';
  }

  fontsByCategory(category: string) {
    return this.fonts.filter(f => f.category === category);
  }

  // ── Font size ──────────────────────────────────────────────────────────────
  decreaseFontSize(): void {
    if (this.fontSize <= 1) return;
    this.fontSize = Math.max(1, this.fontSize - 1);
    this.apply({ fontSize: this.fontSize });
    this.cdr.markForCheck();
  }

  increaseFontSize(): void {
    this.fontSize += 1;
    this.apply({ fontSize: this.fontSize });
    this.cdr.markForCheck();
  }

  onFontSizeCommit(rawValue: string): void {
    const value = parseInt(rawValue, 10);
    if (isNaN(value) || value < 1) return;
    this.fontSize = value;
    this.apply({ fontSize: this.fontSize });
    this.cdr.markForCheck();
  }

  // ── Font family ────────────────────────────────────────────────────────────
  toggleFontPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.showFontPicker = !this.showFontPicker;
    this.showAlignMenu = false;
    this.cdr.markForCheck();
  }

  selectFont(fontKey: string): void {
    this.fontFamily = fontKey;
    this.apply({ fontFamily: fontKey });
    this.showFontPicker = false;
    this.cdr.markForCheck();
  }

  // ── Bold / Italic ──────────────────────────────────────────────────────────
  toggleBold(): void {
    this.fontWeight = this.isBold ? 'normal' : 'bold';
    this.apply({ fontWeight: this.fontWeight });
    this.cdr.markForCheck();
  }

  toggleItalic(): void {
    this.fontStyle = this.isItalic ? 'normal' : 'italic';
    this.apply({ fontStyle: this.fontStyle });
    this.cdr.markForCheck();
  }

  // ── Color ──────────────────────────────────────────────────────────────────
  onColorChange(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.fill = color;
    this.apply({ fill: color });
    this.cdr.markForCheck();
  }

  // ── Alignment ──────────────────────────────────────────────────────────────
  toggleAlignMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showAlignMenu = !this.showAlignMenu;
    this.showFontPicker = false;
    this.cdr.markForCheck();
  }

  setAlign(align: string): void {
    this.textAlign = align;
    this.apply({ textAlign: align });
    this.showAlignMenu = false;
    this.cdr.markForCheck();
  }

  // ── Spacing ────────────────────────────────────────────────────────────────
  toggleSpacingPanel(event: MouseEvent): void {
    event.stopPropagation();
    this.showSpacingPanel = !this.showSpacingPanel;
    this.showFontPicker = false;
    this.showAlignMenu = false;
    this.cdr.markForCheck();
  }

  onLineHeightChange(value: number): void {
    this.lineHeight = value;
    this.apply({ lineHeight: value });
    this.cdr.markForCheck();
  }

  onCharSpacingChange(value: number): void {
    this.charSpacing = value;
    this.apply({ charSpacing: value });
    this.cdr.markForCheck();
  }

  // ── Delete / Close ─────────────────────────────────────────────────────────
  deleteObject(): void {
    if (!this.activeObject || !this.canvas) return;
    this.canvas.remove(this.activeObject);
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  close(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  // ── Close dropdowns on outside click ──────────────────────────────────────
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showFontPicker || this.showAlignMenu || this.showSpacingPanel) {
      this.showFontPicker = false;
      this.showAlignMenu = false;
      this.showSpacingPanel = false;
      this.cdr.markForCheck();
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private readFromObject(obj: FabricTextObj): void {
    this.fontSize = Math.round(obj.fontSize ?? 24);
    this.fontFamily = obj.fontFamily ?? 'Inter';
    this.fontWeight = obj.fontWeight ?? 'normal';
    this.fontStyle = obj.fontStyle ?? 'normal';
    this.fill = this.toHexColor(obj.fill);
    this.textAlign = obj.textAlign ?? 'left';
    this.lineHeight = obj.lineHeight ?? 1.16;
    this.charSpacing = obj.charSpacing ?? 0;
  }

  private toHexColor(fill: string | null | undefined): string {
    if (!fill || typeof fill !== 'string') return '#000000';
    if (fill.startsWith('#')) {
      return fill.length === 4 ? '#' + fill.slice(1).split('').map(c => c + c).join('') : fill.slice(0, 7);
    }
    const m = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }
    return '#000000';
  }

  private apply(props: Record<string, unknown>): void {
    if (!this.activeObject || !this.canvas) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.activeObject as any).set(props);
    this.canvas.renderAll();
  }

  private loadGoogleFonts(): void {
    const linkId = 'google-fonts-editor';
    if (this.doc.getElementById(linkId)) return;
    const families = GOOGLE_FONTS.map(f => f.key.replace(/ /g, '+')).join('&family=');
    const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    const link = this.doc.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = href;
    this.doc.head.appendChild(link);
  }
}
