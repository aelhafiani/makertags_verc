import { Canvas, FabricObject } from 'fabric';
import { nanoid } from 'nanoid';

export interface EditablePanelField {
  objectId: string;
  objectType: 'i-text' | 'textbox';
  label: string;
  value: string;
  indexOnCanvas: number;
}

export function buildFieldsFromCanvas(canvas: Canvas): EditablePanelField[] {
  return canvas
    .getObjects()
    .map((object, index) => ({ object, index }))
    .filter(({ object }) => object.type === 'i-text' || object.type === 'textbox')
    .map(({ object, index }) => {
      const withId = object as FabricObject & { id?: string; text?: string };
      const value = withId.text ?? '';
      const cleanPreview = value.trim();
      const label = cleanPreview ? cleanPreview.slice(0, 20) : `Text field ${index + 1}`;

      if (!withId.id) {
        withId.set('id', nanoid());
      }

      return {
        objectId: withId.id ?? nanoid(),
        objectType: object.type as 'i-text' | 'textbox',
        label,
        value,
        indexOnCanvas: index,
      };
    });
}

