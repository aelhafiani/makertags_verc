import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PagesSelectorComponent } from '../../pages-selector/pages-selector.component';

@Component({
  selector: 'maker-tags-mini-preview-column',
  standalone: true,
  imports: [PagesSelectorComponent],
  templateUrl: './mini-preview-column.component.html',
  styleUrl: './mini-preview-column.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniPreviewColumnComponent {}

