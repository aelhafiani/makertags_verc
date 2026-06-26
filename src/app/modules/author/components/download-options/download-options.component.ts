import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, OnChanges } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { SharedUiComponentsModule } from '../../../shared/shared-ui-components.module';
import { FormsModule } from '@angular/forms';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

export interface IDownloadOptions {
  switchValueBleed: boolean
  marks: boolean
  savePaper: boolean
  splitByGroup: boolean
  printType: string
  printJpegQuality: string
  printPngQuality: string
  paperFormat: string
}
export interface IDownloadJpegOptions {
  switchValueBleed: boolean
  printJpegQuality: string
}
export interface IDownloadPnggOptions {
  switchValueBleed: boolean
  printPngQuality: string
}

export const PAPER_FORMATS: Record<string, { label: string; w: number; h: number }> = {
  'A4-L': { label: 'A4 Paysage',  w: 842, h: 595 },
  'A4-P': { label: 'A4 Portrait', w: 595, h: 842 },
  'A3-L': { label: 'A3 Paysage',  w: 1191, h: 842 },
  'A3-P': { label: 'A3 Portrait', w: 842, h: 1191 },
  'LT-L': { label: 'Letter Paysage', w: 792, h: 612 },
  'LT-P': { label: 'Letter Portrait', w: 612, h: 792 },
  'A5-L': { label: 'A5 Paysage',  w: 595, h: 420 },
  'A5-P': { label: 'A5 Portrait', w: 420, h: 595 },
};

const CROP_MARGIN_PT = 24;

@Component({
  selector: 'maker-tags-download-options',
  templateUrl: './download-options.component.html',
  styleUrl: './download-options.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    SharedUiComponentsModule,
    FormsModule,
    NzProgressModule,
    NzSwitchModule,
    NzIconModule,
    NzButtonModule,
    NzSelectModule,
  ]
})
export class DownloadOptionsComponent implements OnChanges {
  @Input() is3D_art: boolean = false
  @Input() isDownloaded: boolean = false
  @Input() progress: number = 0
  @Input() artSize: string = ''

  switchValueBleed: boolean = false
  marks: boolean = false
  savePaper: boolean = false
  splitByGroup: boolean = false
  printJpegQuality: string = '300dpi'
  printPngQuality: string = '300dpi'

  // Split selectors
  paperSize: string = 'A4'
  paperOrientation: string = 'L'
  get paperFormat(): string { return `${this.paperSize}-${this.paperOrientation}`; }

  paperSizeOptions = [
    { value: 'A4',  label: 'A4  (210 × 297 mm)' },
    { value: 'A3',  label: 'A3  (297 × 420 mm)' },
    { value: 'A5',  label: 'A5  (148 × 210 mm)' },
    { value: 'LT',  label: 'Letter (216 × 279 mm)' },
  ];
  paperOrientationOptions = [
    { value: 'L', label: '⬛ Paysage' },
    { value: 'P', label: '⬜ Portrait' },
  ];

  piecesCount: number = 0

  @Output() downloadAction = new EventEmitter<IDownloadOptions>()

  ngOnChanges(): void {
    this.updatePiecesCount();
  }

  onOptionChange(): void {
    this.updatePiecesCount();
  }

  private updatePiecesCount(): void {
    if (!this.artSize) { this.piecesCount = 0; return; }
    const parts = this.artSize.split(/[^0-9.]+/).map(Number).filter(n => n > 0);
    if (parts.length < 2) { this.piecesCount = 0; return; }
    const trimW = parts[0] * 72;
    const trimH = parts[1] * 72;
    const fmt = PAPER_FORMATS[this.paperFormat];
    const availW = fmt.w - 2 * CROP_MARGIN_PT;
    const availH = fmt.h - 2 * CROP_MARGIN_PT;
    const cols = Math.floor(availW / trimW);
    const rows = Math.floor(availH / trimH);
    this.piecesCount = Math.max(cols, 0) * Math.max(rows, 0);
  }

  downloadFile(type: string): void {
    this.downloadAction.emit({
      switchValueBleed: this.switchValueBleed,
      marks: this.marks,
      savePaper: this.savePaper,
      splitByGroup: this.splitByGroup,
      printJpegQuality: this.printJpegQuality,
      printPngQuality: this.printPngQuality,
      printType: type,
      paperFormat: this.paperFormat,
    });
  }
}
