import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable, map } from 'rxjs';
import { EditPanelComponent } from '../../panels/edit-panel/edit-panel.component';
import { AddTextPanelComponent } from '../../panels/add-text-panel/add-text-panel.component';
import { AddImagePanelComponent } from '../../panels/add-image-panel/add-image-panel.component';
import { BackgroundPanelComponent } from '../../panels/background-panel/background-panel.component';
import { ElementsPanelComponent } from '../../panels/elements-panel/elements-panel.component';
import { LayeringEditorComponent } from '../../layering-editor/layering-editor.component';
import { QrcodePanelComponent } from '../../panels/qrcode-panel/qrcode-panel.component';
import { EditorShellState, ToolId } from '../../../services/editor-shell.state';

const TOOL_TO_COMPONENT: Partial<Record<ToolId, Type<unknown>>> = {
  edit: EditPanelComponent,
  'add-text': AddTextPanelComponent,
  'add-image': AddImagePanelComponent,
  background: BackgroundPanelComponent,
  elements: ElementsPanelComponent,
  layers: LayeringEditorComponent,
  qrcode: QrcodePanelComponent,
};

@Component({
  selector: 'maker-tags-contextual-panel',
  standalone: true,
  imports: [
    CommonModule,
    AddTextPanelComponent,
    AddImagePanelComponent,
    EditPanelComponent,
    BackgroundPanelComponent,
    ElementsPanelComponent,
    LayeringEditorComponent,
    QrcodePanelComponent,
  ],
  templateUrl: './contextual-panel.component.html',
  styleUrl: './contextual-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextualPanelComponent {
  readonly component$: Observable<Type<unknown> | null>;

  constructor(private readonly store: Store) {
    this.component$ = this.store.select(EditorShellState.getActiveTool).pipe(
      map((tool: ToolId | null) => (tool ? (TOOL_TO_COMPONENT[tool] ?? null) : null))
    );
  }
}
