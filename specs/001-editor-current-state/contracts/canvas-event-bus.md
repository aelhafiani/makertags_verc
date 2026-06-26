# Contract: Canvas Event Bus (CanvasUtilsService)

**Branch**: `001-editor-current-state` | **Date**: 2026-04-11  
**Source**: `src/app/modules/shared/canvas/canvas.utils.service.ts`

---

## Overview

`CanvasUtilsService` is an injectable singleton that acts as the inter-component event bus between:
- Property editor components (font, size, color, etc.) → canvas
- Tab components (add text, add elements) → canvas

It uses two `BehaviorSubject` streams.

---

## Stream 1: `addElementEvent$`

**Producer**: Tab components (`AddElementsComponent`, `AddTextComponent`)  
**Consumer**: `AuthorLayoutComponent` (subscribed in canvas event loop)

**Event shape**:
```typescript
interface IEditorEventAdd {
  name: 'addImage' | 'addForm';
  value: any;  // Image object (for addImage) | shape name string (for addForm)
}
```

**Known events**:

| `name` | `value` | Effect |
|---|---|---|
| `'addImage'` | Image object from Supabase | Loads image URL via `FabricImage.fromURL()`, adds to canvas |
| `'addForm'` | `'square' \| 'circle' \| 'triangle' \| 'line'` | Creates a basic Fabric.js shape and adds to canvas |

**Method**: `canvasUtilService.setAddElementEvent(event: IEditorEvent)`

---

## Stream 2: `editorEvent$`

**Producer**: Property editor components (font family, size, color, align, spacing, opacity, position)  
**Consumer**: `AuthorLayoutComponent` (subscribed, applies update to `canvas.getActiveObject()`)

**Event shape**:
```typescript
interface IEditorEvent {
  name: string;   // Property key to update on active Fabric.js object
  value: any;     // New value for that property
}
```

**Known event names** (from editor components):
- `fontFamily` — font family string
- `fontSize` — number
- `fill` — color string (text color)
- `textAlign` — `'left' | 'center' | 'right' | 'justify'`
- `charSpacing` — number (letter spacing)
- `opacity` — number 0–1
- `superposition` — z-index direction (`POSITIONS` enum)

---

## Page Selection Bus

**Source**: `pages-selector.component.ts` (exported module-level BehaviorSubject)

```typescript
export const selectedPageIndexSubj = new BehaviorSubject<number>(0);
export const selectedPage$ = selectedPageIndexSubj.asObservable();
```

**Producer**: `PagesSelectorComponent.selectPage(index: number)`  
**Consumer**: `AuthorLayoutComponent` (subscribes to `selectedPage$` to swap canvas JSON on face change)

**Note**: This is a module-level global, not an Angular service — it bypasses the DI system.
