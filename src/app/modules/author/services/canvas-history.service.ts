import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Canvas, FabricObject } from 'fabric';
import { nanoid } from 'nanoid';

export type HistoryActionType =
  | 'object:added'
  | 'object:removed'
  | 'object:modified'
  | 'text:changed'
  | 'style:changed'
  | 'layer:visibility'
  | 'layer:lock'
  | 'background:changed';

interface HistoryEntry {
  id: string;
  pageId: string;
  timestamp: number;
  actionType: HistoryActionType;
  canvasJson: Record<string, unknown>;
  selectionId: string | null;
}

interface FaceHistory {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}

const MAX_STACK = 100;
const HISTORY_SNAPSHOT_KEYS = [
  'id',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'visible',
  'selectable',
];

@Injectable({ providedIn: 'root' })
export class CanvasHistoryService {
  private canvas: Canvas | null = null;
  private activePageId: string | null = null;
  private readonly faces = new Map<string, FaceHistory>();
  private isReplaying = false;
  private textChangedTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly canUndoSubject = new BehaviorSubject<boolean>(false);
  private readonly canRedoSubject = new BehaviorSubject<boolean>(false);
  readonly canUndo$: Observable<boolean> = this.canUndoSubject.asObservable();
  readonly canRedo$: Observable<boolean> = this.canRedoSubject.asObservable();

  private readonly onObjectAdded = () => this.push('object:added');
  private readonly onObjectRemoved = () => this.push('object:removed');
  private readonly onObjectModified = () => this.push('object:modified');
  private readonly onTextChanged = () => {
    if (this.textChangedTimer) {
      clearTimeout(this.textChangedTimer);
    }
    this.textChangedTimer = setTimeout(() => this.push('text:changed'), 500);
  };

  attach(canvas: Canvas, pageId: string): void {
    this.detach();

    this.canvas = canvas;
    this.activePageId = pageId;
    if (!this.faces.has(pageId)) {
      this.faces.set(pageId, { undoStack: [], redoStack: [] });
    }

    canvas.on('object:added', this.onObjectAdded);
    canvas.on('object:removed', this.onObjectRemoved);
    canvas.on('object:modified', this.onObjectModified);
    canvas.on('text:changed', this.onTextChanged);

    const faceHistory = this.faces.get(pageId);
    if (faceHistory && faceHistory.undoStack.length === 0) {
      this.push('object:modified');
    } else {
      this.updateButtons();
    }
  }

  detach(): void {
    if (this.canvas) {
      this.canvas.off('object:added', this.onObjectAdded);
      this.canvas.off('object:removed', this.onObjectRemoved);
      this.canvas.off('object:modified', this.onObjectModified);
      this.canvas.off('text:changed', this.onTextChanged);
    }

    if (this.textChangedTimer) {
      clearTimeout(this.textChangedTimer);
      this.textChangedTimer = null;
    }

    this.canvas = null;
    this.activePageId = null;
    this.updateButtons();
  }

  push(actionType: HistoryActionType): void {
    if (this.isReplaying || !this.canvas || !this.activePageId) {
      return;
    }

    const face = this.faces.get(this.activePageId);
    if (!face) {
      return;
    }

    const activeObject = this.canvas.getActiveObject() as (FabricObject & { id?: string }) | undefined;
    const entry: HistoryEntry = {
      id: nanoid(),
      pageId: this.activePageId,
      timestamp: Date.now(),
      actionType,
      canvasJson: this.canvas.toObject(HISTORY_SNAPSHOT_KEYS) as Record<string, unknown>,
      selectionId: activeObject?.id ?? null,
    };

    face.undoStack.push(entry);
    if (face.undoStack.length > MAX_STACK) {
      face.undoStack.shift();
    }
    face.redoStack = [];
    this.updateButtons();
  }

  async undo(): Promise<void> {
    if (!this.activePageId || !this.canvas) {
      return;
    }

    const face = this.faces.get(this.activePageId);
    if (!face || face.undoStack.length <= 1) {
      return;
    }

    const current = face.undoStack.pop();
    if (!current) {
      return;
    }
    face.redoStack.push(current);

    const target = face.undoStack[face.undoStack.length - 1];
    await this.loadFromSnapshot(target);
    this.updateButtons();
  }

  async redo(): Promise<void> {
    if (!this.activePageId || !this.canvas) {
      return;
    }

    const face = this.faces.get(this.activePageId);
    if (!face || face.redoStack.length === 0) {
      return;
    }

    const target = face.redoStack.pop();
    if (!target) {
      return;
    }
    face.undoStack.push(target);
    await this.loadFromSnapshot(target);
    this.updateButtons();
  }

  clear(pageId: string): void {
    this.faces.delete(pageId);
    this.updateButtons();
  }

  private async loadFromSnapshot(entry: HistoryEntry): Promise<void> {
    if (!this.canvas) {
      return;
    }

    this.isReplaying = true;
    await this.canvas.loadFromJSON(entry.canvasJson, (_s: any, instance: any) => {
      if (instance?.type === 'image') instance.set({ crossOrigin: 'anonymous' });
    });
    this.canvas.requestRenderAll();

    if (entry.selectionId) {
      const selected = this.canvas
        .getObjects()
        .find((obj) => (obj as FabricObject & { id?: string }).id === entry.selectionId);
      if (selected) {
        this.canvas.setActiveObject(selected);
      }
    }

    this.isReplaying = false;
  }

  private updateButtons(): void {
    if (!this.activePageId) {
      this.canUndoSubject.next(false);
      this.canRedoSubject.next(false);
      return;
    }

    const face = this.faces.get(this.activePageId);
    this.canUndoSubject.next(!!face && face.undoStack.length > 1);
    this.canRedoSubject.next(!!face && face.redoStack.length > 0);
  }
}

