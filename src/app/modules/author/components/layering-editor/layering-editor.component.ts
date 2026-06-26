import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActiveSelection, Canvas, FabricObject } from 'fabric';
import { nanoid } from 'nanoid';
import { Store } from '@ngxs/store';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Subject, takeUntil } from 'rxjs';
import { CanvasHistoryService } from '../../services/canvas-history.service';
import { CanvasProviderService } from '../../services/canvas-provider.service';
import { EditorAnnouncerService } from '../../services/editor-announcer.service';
import { SetActiveTool } from '../../services/editor-shell.state';

type LayerType = 'text' | 'image' | 'shape' | 'svg' | 'group' | 'contour';

type LayerFabricObject = FabricObject & {
  id?: string;
  text?: string;
  uploadedImagePath?: string;
  uploadedImageUrl?: string;
  isTextureOverlay?: boolean;
  isArtContour?: boolean;
  lockedBackground?: boolean;
  getSrc?: () => string;
};

interface LayerItem {
  fabricObject: LayerFabricObject;
  id: string;
  type: LayerType;
  label: string;
  thumbnail: string | null;
  visible: boolean;
  locked: boolean;
  isSelected: boolean;
  isContour: boolean;
}

@Component({
  selector: 'maker-tags-layering-editor',
  templateUrl: './layering-editor.component.html',
  standalone: true,
  imports: [
    CommonModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
  ],
  styleUrl: './layering-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayeringEditorComponent implements OnInit, OnDestroy {
  layers: LayerItem[] = [];

  private canvas: Canvas | null = null;
  private selectedIds = new Set<string>();
  private readonly destroy$ = new Subject<void>();

  private readonly onCanvasObjectsChanged = () => this.rebuildLayers();
  private readonly onCanvasSelectionChanged = () => {
    this.selectedIds = this.resolveSelectedIds();
    this.rebuildLayers();
  };

  constructor(
    private readonly canvasProvider: CanvasProviderService,
    private readonly history: CanvasHistoryService,
    private readonly announcer: EditorAnnouncerService,
    private readonly store: Store,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$.pipe(takeUntil(this.destroy$)).subscribe((canvas) => {
      this.detachCanvasListeners();
      this.canvas = canvas;
      this.selectedIds = new Set();

      if (!canvas) {
        this.layers = [];
        this.cdr.markForCheck();
        return;
      }

      canvas.on('object:added', this.onCanvasObjectsChanged);
      canvas.on('object:removed', this.onCanvasObjectsChanged);
      canvas.on('object:modified', this.onCanvasObjectsChanged);
      canvas.on('selection:created', this.onCanvasSelectionChanged);
      canvas.on('selection:updated', this.onCanvasSelectionChanged);
      canvas.on('selection:cleared', this.onCanvasSelectionChanged);
      this.selectedIds = this.resolveSelectedIds();
      this.rebuildLayers();
    });

    this.canvasProvider.selection$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.selectedIds = this.resolveSelectedIds();
      this.rebuildLayers();
    });
  }

  ngOnDestroy(): void {
    this.detachCanvasListeners();
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectLayer(layer: LayerItem, event: MouseEvent): void {
    if (!this.canvas) {
      return;
    }

    if (layer.isContour) {
      this.store.dispatch(new SetActiveTool('background'));
      return;
    }

    const multi = event.ctrlKey || event.metaKey || event.shiftKey;

    if (multi) {
      const active = this.canvas.getActiveObject();
      const currentObjects: FabricObject[] =
        active instanceof ActiveSelection
          ? active.getObjects()
          : active
          ? [active]
          : [];

      const alreadySelected = currentObjects.includes(layer.fabricObject);
      let nextObjects: FabricObject[];

      if (alreadySelected) {
        nextObjects = currentObjects.filter((o) => o !== layer.fabricObject);
      } else {
        nextObjects = [...currentObjects, layer.fabricObject];
      }

      if (nextObjects.length === 0) {
        this.canvas.discardActiveObject();
      } else if (nextObjects.length === 1) {
        this.canvas.setActiveObject(nextObjects[0]);
      } else {
        const sel = new ActiveSelection(nextObjects, { canvas: this.canvas });
        this.canvas.setActiveObject(sel);
      }
    } else {
      this.canvas.setActiveObject(layer.fabricObject);
    }

    this.canvas.requestRenderAll();
    this.selectedIds = this.resolveSelectedIds();
    this.layers = this.layers.map((item) => ({
      ...item,
      isSelected: this.selectedIds.has(item.id),
    }));
    this.cdr.markForCheck();
  }

  drop(event: CdkDragDrop<LayerItem[]>): void {
    if (!this.canvas || event.previousIndex === event.currentIndex) {
      return;
    }

    // Prevent moving the contour layer or moving anything onto the contour slot
    const moved = this.layers[event.previousIndex];
    const target = this.layers[event.currentIndex];
    if (moved?.isContour || target?.isContour) {
      return;
    }

    const reorderedLayers = [...this.layers];
    const [movedLayer] = reorderedLayers.splice(event.previousIndex, 1);
    reorderedLayers.splice(event.currentIndex, 0, movedLayer);

    const orderedCanvasObjects = reorderedLayers.map((item) => item.fabricObject).reverse();
    orderedCanvasObjects.forEach((object, index) => {
      this.canvas?.moveObjectTo(object, index);
    });

    this.canvas.requestRenderAll();
    this.canvas.fire('object:modified' as any);
    this.history.push('object:modified');
    this.announcer.announce('Layers reordered');
    this.rebuildLayers();
  }

  toggleVisibility(layer: LayerItem, event: Event): void {
    event.stopPropagation();
    if (!this.canvas) {
      return;
    }

    layer.fabricObject.set({ visible: !layer.visible });
    this.canvas.requestRenderAll();
    this.canvas.fire('object:modified' as any, { target: layer.fabricObject });
    this.history.push('layer:visibility');
    this.announcer.announce(layer.visible ? 'Layer hidden' : 'Layer shown');
    this.rebuildLayers();
  }

  toggleLock(layer: LayerItem, event: Event): void {
    event.stopPropagation();
    if (!this.canvas) {
      return;
    }

    const locked = !layer.locked;
    layer.fabricObject.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      selectable: !locked,
      evented: !locked,
    });

    if (locked && this.canvas.getActiveObject() === layer.fabricObject) {
      this.canvas.discardActiveObject();
    }

    this.canvas.requestRenderAll();
    this.canvas.fire('object:modified' as any, { target: layer.fabricObject });
    this.history.push('layer:lock');
    this.announcer.announce(locked ? 'Layer locked' : 'Layer unlocked');
    this.rebuildLayers();
  }

  removeLayer(layer: LayerItem, event: Event): void {
    event.stopPropagation();
    if (!this.canvas || layer.isContour) {
      return;
    }

    if (this.canvas.getActiveObject() === layer.fabricObject) {
      this.canvas.discardActiveObject();
    }

    this.canvas.remove(layer.fabricObject);
    this.canvas.requestRenderAll();
    this.canvas.fire('object:modified' as any);
    this.announcer.announce('Layer removed');
    this.rebuildLayers();
  }

  trackLayer(_index: number, layer: LayerItem): string {
    return layer.id;
  }

  layerIcon(type: LayerType): string {
    switch (type) {
      case 'text':
        return 'font-size';
      case 'image':
        return 'picture';
      case 'group':
        return 'deployment-unit';
      case 'contour':
        return 'bg-colors';
      case 'svg':
      case 'shape':
      default:
        return 'border';
    }
  }

  private rebuildLayers(): void {
    if (!this.canvas) {
      this.layers = [];
      this.cdr.markForCheck();
      return;
    }

    const allObjects = this.canvas
      .getObjects()
      .filter((o) => this.isUserLayer(o as LayerFabricObject)) as LayerFabricObject[];

    // Separate contour/background layers from regular user layers
    const contourObjects = allObjects.filter((o) => this.isContourLayer(o));
    const regularObjects = allObjects
      .filter((o) => !this.isContourLayer(o))
      .slice()
      .reverse(); // top layer first

    const toLayerItem = (object: LayerFabricObject): LayerItem => {
      const isContour = this.isContourLayer(object);
      const id = this.ensureObjectId(object);
      const type: LayerType = isContour ? 'contour' : this.mapType(object.type ?? null);
      return {
        fabricObject: object,
        id,
        type,
        label: this.buildLabel(object, type),
        thumbnail: this.buildThumbnail(object),
        visible: object.visible !== false,
        locked: this.isLocked(object),
        isSelected: this.selectedIds.has(id),
        isContour,
      };
    };

    // Regular layers on top, contour layer(s) pinned to the bottom
    this.layers = [
      ...regularObjects.map(toLayerItem),
      ...contourObjects.map(toLayerItem),
    ];

    this.cdr.markForCheck();
  }

  private ensureObjectId(object: LayerFabricObject): string {
    if (!object.id) {
      object.set('id', nanoid());
    }
    return object.id ?? nanoid();
  }

  private buildLabel(object: LayerFabricObject, type: LayerType): string {
    if (type === 'contour') {
      return 'Background';
    }

    if (type === 'text') {
      const content = (object.text ?? '').trim();
      return content ? this.truncate(content, 20) : 'Text';
    }

    if (type === 'image') {
      const src = object.uploadedImagePath ?? object.uploadedImageUrl ?? object.getSrc?.() ?? '';
      const fileName = src.split('/').pop()?.split('?')[0];
      return fileName ? this.truncate(decodeURIComponent(fileName), 24) : 'Image';
    }

    if (type === 'group') {
      return 'Group';
    }

    return type === 'svg' ? 'SVG' : 'Shape';
  }

  private buildThumbnail(object: LayerFabricObject): string | null {
    try {
      return (object as unknown as { toDataURL: (options?: Record<string, unknown>) => string }).toDataURL({
        format: 'png',
        multiplier: 0.25,
      });
    } catch {
      return null;
    }
  }

  private isLocked(object: LayerFabricObject): boolean {
    return Boolean(
      object.lockMovementX &&
      object.lockMovementY &&
      object.lockScalingX &&
      object.lockScalingY &&
      object.lockRotation
    );
  }

  private isUserLayer(object: LayerFabricObject): boolean {
    // Texture overlay is purely technical — never show it
    return !object.isTextureOverlay;
  }

  private isContourLayer(object: LayerFabricObject): boolean {
    return Boolean(object.isArtContour || object.lockedBackground);
  }

  private mapType(type: string | null): LayerType {
    if (type === 'i-text' || type === 'textbox') {
      return 'text';
    }
    if (type === 'image') {
      return 'image';
    }
    if (type === 'group') {
      return 'group';
    }
    if (type === 'path') {
      return 'svg';
    }
    return 'shape';
  }

  private resolveSelectedIds(): Set<string> {
    const active = this.canvas?.getActiveObject();
    if (!active) return new Set();
    if (active instanceof ActiveSelection) {
      return new Set(
        active.getObjects().map((o) => this.ensureObjectId(o as LayerFabricObject))
      );
    }
    return new Set([this.ensureObjectId(active as LayerFabricObject)]);
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }

  private detachCanvasListeners(): void {
    if (!this.canvas) {
      return;
    }

    this.canvas.off('object:added', this.onCanvasObjectsChanged);
    this.canvas.off('object:removed', this.onCanvasObjectsChanged);
    this.canvas.off('object:modified', this.onCanvasObjectsChanged);
    this.canvas.off('selection:created', this.onCanvasSelectionChanged);
    this.canvas.off('selection:updated', this.onCanvasSelectionChanged);
    this.canvas.off('selection:cleared', this.onCanvasSelectionChanged);
  }
}
