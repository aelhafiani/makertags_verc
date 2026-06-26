import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Canvas, FabricObject } from 'fabric';

export interface CanvasSelection {
  objectId: string | null;
  objectType: string | null;
  isMultiSelection: boolean;
}

@Injectable({ providedIn: 'root' })
export class CanvasProviderService {
  private readonly canvasSubject = new BehaviorSubject<Canvas | null>(null);
  private readonly selectionSubject = new BehaviorSubject<CanvasSelection>({
    objectId: null,
    objectType: null,
    isMultiSelection: false,
  });
  private readonly activeObjectSubject = new BehaviorSubject<FabricObject | null>(null);

  readonly canvas$: Observable<Canvas | null> = this.canvasSubject.asObservable();
  readonly selection$: Observable<CanvasSelection> = this.selectionSubject.asObservable();
  readonly activeObject$: Observable<FabricObject | null> = this.activeObjectSubject.asObservable();

  get canvas(): Canvas | null {
    return this.canvasSubject.value;
  }

  setCanvas(canvas: Canvas | null): void {
    this.canvasSubject.next(canvas);
  }

  setSelection(selection: CanvasSelection, activeObject: FabricObject | null = null): void {
    this.selectionSubject.next(selection);
    this.activeObjectSubject.next(activeObject);
  }
}

