# Contract: Editor Shell (Sidebar + Panel Orchestration)

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12
**Source target**: `src/app/modules/author/components/shell/editor-shell.component.ts` (new)
**Consumers**: All seven contextual panels, floating toolbar, topbar, mini-preview column.

---

## Overview

`EditorShellComponent` is the new root editor component. It replaces `AuthorLayoutComponent` as the route target and owns:

1. The four-zone layout (left sidebar, contextual panel, canvas, mini-preview column).
2. The live `fabric.Canvas` instance.
3. The active-tool state (`EditorShellStateModel.activeTool`).
4. Wiring between the legacy `PagesSelectorComponent` (face switcher, preserved as-is) and the new panels.
5. The ARIA live region used by all panels for announcements.

It does NOT own: undo/redo history (→ `CanvasHistoryService`), image uploads (→ `ImageUploadService`), icon search (→ `IconifyAdapterService`), or Supabase CRUD (→ existing `ArtFacadeService` / `ArtDocsService`).

---

## Public inputs / outputs

### Route-level

```typescript
// Route: /author/:id (unchanged from existing)
// Input: art doc ID in route/query param
// Loads IArtDoc via ArtFacadeService.selectOrCreateArtDoc(id) — identical to existing AuthorLayoutComponent
```

### Template contract for child panels

Each panel component is an Angular standalone component that receives:

```typescript
interface PanelContext {
  canvas: fabric.Canvas;          // Live canvas instance
  activeFace$: Observable<IArtPage>;
  selection$: Observable<{
    objectId: string | null;
    objectType: CanvasObjectType | null;
    isMultiSelection: boolean;
  }>;
  announce: (message: string) => void;   // ARIA live region publisher
}
```

Panels MUST NOT keep private references to the canvas that outlive their lifecycle — they subscribe via `@Input()` or DI of a `CanvasProvider` service bound to the shell.

---

## Tool-activation contract

```typescript
// Shell API — exposed via NGXS actions
class SetActiveTool {
  static readonly type = '[Editor] SetActiveTool';
  constructor(public tool: ToolId | null) {}
}
```

**Semantics**:

| Previous state | `SetActiveTool` payload | Result |
|---|---|---|
| `activeTool = null` | `ToolId` | Open panel, animate in (260ms), set activeTool |
| `activeTool = X` | same `X` | Close panel, set activeTool to null (FR-003 toggle) |
| `activeTool = X` | different `Y` | Close panel X, open panel Y (FR-003) |
| any | `null` | Close panel |

**Animation**: Angular `@slideInOut` trigger, 260ms ease-out. Canvas layout is NOT reflowed during animation (panel slides over; canvas width is constant — the 260px panel lane is reserved at all times in the grid).

---

## Selection contract

The shell subscribes to Fabric.js canvas events once and publishes normalized selection state:

```typescript
canvas.on('selection:created', updateSelection);
canvas.on('selection:updated', updateSelection);
canvas.on('selection:cleared', clearSelection);
```

`updateSelection(e)` derives:
- `objectId` from `canvas.getActiveObject().id`
- `objectType` via a type mapper (`'i-text' | 'textbox' → 'text'`, `'image' → 'image'`, `'rect' | 'circle' | 'triangle' → 'shape'`, `'group' → 'svg' | 'group'`)
- `isMultiSelection` from `canvas.getActiveObjects().length > 1`

Published to both `EditorShellStateModel.selection` (NGXS) and the floating toolbar controller.

---

## Topbar integration

```typescript
interface TopbarViewModel {
  artDocTitle: string;             // From IArtDoc.title
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  canUndo: boolean;                // canvasHistory.canUndo(activePageId)
  canRedo: boolean;
}
```

- `Save and Exit` → navigates out of editor route; auto-save flushes first.
- `Undo` button → `CanvasHistoryService.undo(activePageId)`.
- `Redo` button → `CanvasHistoryService.redo(activePageId)`.
- `Preview` button → opens the existing `PagesSelectorComponent` preview modal (reused).
- `Next` CTA → routes to downstream step (placeholder in Phase 1, per spec assumption).

---

## Keyboard & accessibility contract

| Key | Target | Action |
|---|---|---|
| `Tab` / `Shift+Tab` | Any focusable | Standard document order; panel participates only while open |
| `ArrowUp` / `ArrowDown` | Sidebar (focused) | Roving-tabindex between the 7 tool icons |
| `Enter` / `Space` | Sidebar icon | Activate tool (same as `SetActiveTool`) |
| `Escape` | While panel open | `SetActiveTool(null)` |
| `Ctrl+Z` / `Cmd+Z` | Editor viewport | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Editor viewport | Redo |
| `Delete` / `Backspace` | With selection | Delete active object (also pushes to history) |

ARIA live region (`<div aria-live="polite" class="sr-only">`) receives:
- `"Edit panel opened"` / `"Edit panel closed"` on tool changes
- `"{objectType} selected"` on selection changes
- `"Saving…"` / `"Saved"` on auto-save status transitions
- `"Undid last change"` / `"Redid change"` on undo/redo

---

## Failure modes

| Condition | Behavior |
|---|---|
| Canvas not yet initialized | Shell renders skeleton; panels show loading state |
| Panel component fails to load | Fallback empty state with `nzResult` error; sidebar icon remains active for retry |
| NGXS state desync with canvas | Shell re-derives selection from `canvas.getActiveObject()` on next user action; no explicit reconciliation |
| Route param missing | Redirect to catalog (existing behavior preserved) |

---

## Non-goals for this contract

- Panel internal logic — each panel has its own contract (see other contract files where applicable, or the spec's FRs).
- Canvas rendering primitives — owned by Fabric.js, not this shell.
- Auto-save mechanics — preserved from existing `ArtFacadeService.updateUserArtDocFace()`.
