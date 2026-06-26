import { Injectable } from '@angular/core';
import { FabricObject } from 'fabric';

export type FloatingToolbarControl =
  | 'fontSize'
  | 'fontFamily'
  | 'bold'
  | 'italic'
  | 'textAlign'
  | 'color'
  | 'crop'
  | 'replace'
  | 'flipH'
  | 'flipV'
  | 'fill'
  | 'border'
  | 'opacity'
  | 'delete';

export interface FloatingToolbarDescriptor {
  controls: FloatingToolbarControl[];
  anchorRect: { left: number; top: number; width: number; height: number };
}

@Injectable({ providedIn: 'root' })
export class FloatingToolbarController {
  resolveFor(object: FabricObject, isMultiSelection: boolean): FloatingToolbarDescriptor {
    if (isMultiSelection) {
      return {
        controls: ['delete'],
        anchorRect: object.getBoundingRect(),
      };
    }

    const type = object.type;
    const textTypes = new Set(['i-text', 'textbox']);
    const shapeTypes = new Set(['rect', 'circle', 'triangle', 'polygon', 'ellipse', 'line']);

    if (textTypes.has(type)) {
      return {
        controls: ['fontSize', 'fontFamily', 'bold', 'italic', 'textAlign', 'color', 'delete'],
        anchorRect: object.getBoundingRect(),
      };
    }

    if (type === 'image') {
      return {
        controls: ['crop', 'replace', 'flipH', 'flipV', 'delete'],
        anchorRect: object.getBoundingRect(),
      };
    }

    if (shapeTypes.has(type)) {
      return {
        controls: ['fill', 'border', 'opacity', 'delete'],
        anchorRect: object.getBoundingRect(),
      };
    }

    return {
      controls: ['fill', 'opacity', 'delete'],
      anchorRect: object.getBoundingRect(),
    };
  }
}

