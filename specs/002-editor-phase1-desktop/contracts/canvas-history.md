# Contract: Canvas History Service (Undo / Redo)

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12
**Source target**: `src/app/modules/author/services/canvas-history.service.ts` (new)
**Spec references**: FR-020, SC-010, research.md §1, data-model.md `HistoryEntry`

---

## Overview

`CanvasHistoryService` is an injectable singleton (`providedIn: 'root'`) that maintains per-face undo/redo stacks of serialized canvas snapshots. The service owns the memory budget, serialization, and replay; the shell owns the triggers.

Stack coverage (from clarification Q1): object create/delete + text content edits + position/rotate/scale + style property changes (font family, font size, font weight, fill/color, stroke/border, opacity) + visibility/lock toggles.

---

## Public API

```typescript
@Injectable({ providedIn: 'root' })
class CanvasHistoryService {
  /** Attach a canvas and begin recording snapshots for the given face. */
  attach(canvas: fabric.Canvas, pageId: string): void;

  /** Detach from the current canvas (on face switch or shell destroy). */
  detach(): void;

  /** Manually push a snapshot. Called by the shell for non-Fabric actions
   *  (layer visibility/lock toggles, background changes). */
  push(actionType: HistoryActionType): void;

  /** Undo one step on the active face. No-op if stack is empty. */
  undo(): Promise<void>;

  /** Redo one step. No-op if redo stack is empty. */
  redo(): Promise<void>;

  /** Observables for topbar button enablement. */
  canUndo$: Observable<boolean>;
  canRedo$: Observable<boolean>;

  /** Clear history for a specific face. Called when a face is removed or
   *  when the editor is reset. */
  clear(pageId: string): void;
}
```

---

## Internal state

```typescript
interface FaceHistory {
  pageId: string;
  undoStack: HistoryEntry[];   // Bounded LRU, capacity 100
  redoStack: HistoryEntry[];   // Unbounded in practice (capped at 100 by the undo logic)
}

// Singleton state
private faces = new Map<string, FaceHistory>();
private activePageId: string | null = null;
private canvas: fabric.Canvas | null = null;
```

---

## Snapshot format

```typescript
const HISTORY_SNAPSHOT_KEYS = [
  'id',
  'lockMovementX', 'lockMovementY',
  'lockScalingX', 'lockScalingY',
  'visible',
  'selectable',
];

// On push:
const canvasJson = canvas.toObject(HISTORY_SNAPSHOT_KEYS);
const entry: HistoryEntry = {
  id: nanoid(),
  pageId: activePageId!,
  timestamp: Date.now(),
  actionType,
  canvasJson,
  selectionId: canvas.getActiveObject()?.id ?? null,
};
```

---

## Automatic triggers (bound in `attach()`)

| Fabric.js event | `actionType` | Debounce |
|---|---|---|
| `object:added` | `'object:added'` | none |
| `object:removed` | `'object:removed'` | none |
| `object:modified` | `'object:modified'` | none (Fabric only fires on mouse-up) |
| `text:changed` | `'text:changed'` | 500ms trailing |

**Style changes from the floating toolbar** do NOT use a Fabric event — the toolbar calls `history.push('style:changed')` explicitly on commit (blur, color-picker close, slider release).

**Layer visibility/lock** calls `history.push('layer:visibility' | 'layer:lock')` from the Layers panel.

**Background changes** call `history.push('background:changed')` from the Background panel.

---

## Replay semantics

```typescript
async undo(): Promise<void> {
  const face = faces.get(activePageId)!;
  if (face.undoStack.length <= 1) return;     // Keep the initial snapshot
  const current = face.undoStack.pop()!;
  face.redoStack.push(current);
  const target = face.undoStack[face.undoStack.length - 1];
  await loadFromSnapshot(target);
}

async loadFromSnapshot(entry: HistoryEntry): Promise<void> {
  // Suspend recording while replaying to prevent recursive pushes
  isReplaying = true;
  await canvas.loadFromJSON(entry.canvasJson);
  canvas.requestRenderAll();
  if (entry.selectionId) {
    const obj = canvas.getObjects().find(o => o.id === entry.selectionId);
    if (obj) canvas.setActiveObject(obj);
  }
  isReplaying = false;
}
```

The service MUST ignore all Fabric.js events while `isReplaying === true` to prevent snapshot loops.

---

## LRU enforcement

```typescript
private push(entry: HistoryEntry): void {
  if (isReplaying) return;
  const face = faces.get(entry.pageId)!;
  face.undoStack.push(entry);
  if (face.undoStack.length > MAX_STACK) {
    face.undoStack.shift();                    // Drop oldest
  }
  face.redoStack.length = 0;                   // New action invalidates redo
  updateCanUndoCanRedo();
}
```

`MAX_STACK = 100` (configurable in future).

---

## Face-switch contract

When the shell switches faces (via existing `selectedPageIndexSubj`):

1. `history.detach()` — unbinds all Fabric event listeners from the current canvas.
2. Shell calls `canvas.loadFromJSON(newFace.canvasContent)`.
3. `history.attach(canvas, newFace.id)` — binds new listeners and initializes (or restores) that face's stack.

A face has its own undo/redo buffer; switching back restores the buffer as it was.

**Initial snapshot**: on `attach()`, if the face has no existing stack, the service immediately pushes a baseline snapshot so that undoing back to the start is possible.

---

## Consumers

- **Topbar** — subscribes to `canUndo$` / `canRedo$` for button enablement.
- **Keyboard handler in EditorShellComponent** — binds `Ctrl+Z` / `Ctrl+Shift+Z` to `undo()` / `redo()`.
- **Layers panel** — calls `push('layer:visibility' | 'layer:lock')` after toggling.
- **Floating toolbar** — calls `push('style:changed')` on property commit.
- **Background panel** — calls `push('background:changed')` after color/image change.

---

## Failure modes

| Condition | Behavior |
|---|---|
| `attach()` called without `detach()` | Previous listeners cleaned up first (defensive) |
| Undo called on empty stack | No-op; no error |
| `loadFromJSON()` throws | Error logged; stack state is left as-was (the pop is rolled back) |
| Snapshot exceeds memory estimate (not detected at runtime) | Relies on LRU bound; no byte-level accounting in Phase 1 |

---

## Testing contract

The service MUST be unit-tested with:

1. A mock `fabric.Canvas` (or a real headless one) that emits `object:added` / `object:modified` / `text:changed`.
2. Verification that `undo()` restores the exact prior state for each supported action type.
3. Verification that a face switch preserves independent stacks.
4. Verification that the 101st push drops the oldest entry.
5. Verification that `loadFromJSON` during replay does NOT push a new snapshot.
