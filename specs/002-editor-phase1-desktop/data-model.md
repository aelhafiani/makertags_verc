# Data Model: Editor Phase 1 — Desktop Redesign

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12
**Scope**: New entities introduced by the Phase 1 redesign. Preserved entities (`IArtDoc`, `IArtPage`, Fabric.js `Canvas`/`FabricObject`) are documented in `specs/001-editor-current-state/data-model.md` and are referenced here without re-defining them.

---

## New Entities

### HistoryEntry

An immutable snapshot of canvas state pushed to the undo/redo stack after every undoable action (FR-020, research §1).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | Yes | Nanoid, unique per entry |
| `pageId` | `string` | Yes | `IArtPage.id` — snapshots are scoped per face so switching faces does not cross-contaminate history |
| `timestamp` | `number` | Yes | `Date.now()` at push time |
| `actionType` | `HistoryActionType` | Yes | See enum below — used for analytics/debugging only; replay does not branch on it |
| `canvasJson` | `object` | Yes | Output of `canvas.toObject(HISTORY_SNAPSHOT_KEYS)` — full canvas state |
| `selectionId` | `string \| null` | No | ID of the object that was active at snapshot time, so undo restores selection |

```typescript
type HistoryActionType =
  | 'object:added'
  | 'object:removed'
  | 'object:modified'       // position, scale, rotation, skew
  | 'text:changed'          // IText/Textbox text content
  | 'style:changed'         // fill, stroke, font, opacity, etc.
  | 'layer:visibility'
  | 'layer:lock'
  | 'background:changed';
```

**Constraints**:
- History is stored per face in a circular buffer (LRU, capacity 100). Oldest dropped when full.
- Pushing a new entry while `redoStack.length > 0` clears the redo stack.
- `canvasJson` MUST NOT include image data URLs — user image entries contain only the Supabase Storage URL (see §2 of research.md).

**State transitions**: entries are immutable once pushed; the only mutation is removal when the LRU buffer overflows or the redo stack is cleared.

---

### UploadedImageRef

A reference to a user-uploaded image stored in Supabase Storage. Used by the Add Image panel gallery and by any `FabricImage` object whose `src` points at the bucket (FR-023, FR-024, research §2).

| Field | Type | Required | Notes |
|---|---|---|---|
| `path` | `string` | Yes | Storage object path: `{userId}/{timestamp}-{nanoid}.{ext}` |
| `url` | `string` | Yes | Public URL returned by `supabase.storage.getPublicUrl(path)` |
| `fileName` | `string` | Yes | Original file name from the user's device, sanitized |
| `mimeType` | `string` | Yes | One of `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml` |
| `sizeBytes` | `number` | Yes | File size at upload time |
| `width` | `number` | No | Intrinsic width, measured client-side before upload |
| `height` | `number` | No | Intrinsic height, measured client-side before upload |
| `uploadedAt` | `string` | Yes | ISO 8601 timestamp |
| `userId` | `string` | Yes | Supabase auth user ID; must equal the prefix in `path` |

**Constraints**:
- `mimeType` MUST be in the allowed set; upload is rejected otherwise (FR-023a).
- `sizeBytes` MUST be ≤ 10,485,760 (10 MiB) (FR-023b).
- If `width > 4000 || height > 4000`, a non-blocking warning is surfaced to the user but the upload still proceeds (FR-023c).

**Not persisted client-side**: `UploadedImageRef` is hydrated from Supabase on panel open; the client does not keep a local DB.

---

### EditorShellState (NGXS sub-state)

NGXS state slice owned by the new editor shell. Replaces nothing in the existing store; added alongside the existing `ArtFacadeService` slices.

```typescript
interface EditorShellStateModel {
  activeTool: ToolId | null;          // Which sidebar icon is active (null = no panel open)
  panelOpen: boolean;                  // Panel visibility (for animation state)
  selection: {
    objectId: string | null;
    objectType: CanvasObjectType | null;
    isMultiSelection: boolean;
  };
  history: {
    pageId: string;                    // History is scoped per face
    undoStack: HistoryEntry[];         // Bounded to 100 entries
    redoStack: HistoryEntry[];
  } | null;
  uploadGallery: {
    items: UploadedImageRef[];
    loading: boolean;
    error: string | null;
  };
  iconSearch: {
    query: string;
    results: IconifySearchResult[];
    loading: boolean;
    error: string | null;
  };
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

type ToolId =
  | 'edit'
  | 'add-text'
  | 'add-image'
  | 'background'
  | 'elements'
  | 'icons'
  | 'layers';

type CanvasObjectType = 'text' | 'image' | 'shape' | 'svg' | 'group';
```

**Constraints**:
- Only one `activeTool` at a time (FR-003).
- `saveStatus` mirrors the existing auto-save signal; the topbar indicator subscribes to it (FR-019).

---

### IconifySearchResult

Transient entity representing a single icon in the Icons panel grid. Not persisted.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | Yes | Iconify identifier, `{prefix}:{name}` (e.g. `mdi:heart`) |
| `prefix` | `string` | Yes | Icon set prefix (e.g. `mdi`, `bi`, `lucide`) |
| `name` | `string` | Yes | Icon name within the set |
| `svg` | `string \| null` | No | Raw SVG string; `null` until lazily fetched on click |

---

### EditablePanelField

Transient entity produced by the Edit panel when it scans the canvas (FR-007..FR-012). Not persisted — regenerated every time the panel opens.

| Field | Type | Required | Notes |
|---|---|---|---|
| `objectId` | `string` | Yes | `FabricObject.id` (nanoid assigned at creation) |
| `objectType` | `'i-text' \| 'textbox'` | Yes | Drives input vs. textarea rendering |
| `label` | `string` | Yes | First ~20 chars of current text, or `"Text field {index}"` if empty (FR-010) |
| `value` | `string` | Yes | Current `text` property of the Fabric.js object |
| `indexOnCanvas` | `number` | Yes | Position in `canvas.getObjects()` — used for fallback labels |

**Lifecycle**:
- Generated by `EditPanelComponent.ngOnInit()` / on panel-open event via `canvas.getObjects().filter(o => o.type === 'i-text' || o.type === 'textbox')`.
- Form edits accumulate in a local `FormGroup`; "Apply changes" commits them to the canvas in bulk (FR-011).

---

### FloatingToolbarDescriptor

Transient configuration returned by `FloatingToolbarController.resolveFor(object)` that drives which controls the toolbar renders (FR-013..FR-017).

```typescript
interface FloatingToolbarDescriptor {
  objectType: CanvasObjectType;
  controls: FloatingToolbarControl[];
  anchorRect: { left: number; top: number; width: number; height: number };
}

type FloatingToolbarControl =
  | { kind: 'fontSize';   min: number; max: number }
  | { kind: 'fontFamily' }
  | { kind: 'bold' }
  | { kind: 'italic' }
  | { kind: 'textAlign' }
  | { kind: 'color' }
  | { kind: 'crop' }
  | { kind: 'replace' }
  | { kind: 'flipH' }
  | { kind: 'flipV' }
  | { kind: 'fill' }
  | { kind: 'border' }
  | { kind: 'opacity' }
  | { kind: 'delete' }
  | { kind: 'duplicate' };
```

Per FR-014 the controls set is derived from `objectType`:
- **text** (IText/Textbox) → `fontSize`, `fontFamily`, `bold`, `italic`, `textAlign`, `color`, `delete`
- **image** → `crop`, `replace`, `flipH`, `flipV`, `delete`
- **shape** → `fill`, `border`, `opacity`, `delete`
- **svg** → `fill`, `opacity`, `delete`
- **multi-selection** → only `delete` (FR-039)

---

## Relationships

```
IArtDoc (existing)
  └── pages: IArtPage[] (1..2)                       (existing)
        ├── canvasContent: FabricJSON                 (existing; history snapshots derived from this)
        └── [per-face HistoryEntry buffer]            (new, runtime only)

EditorShellStateModel (new, NGXS)
  ├── selection ────→ active FabricObject in Canvas
  ├── history  ─────→ { undoStack, redoStack } of HistoryEntry
  ├── uploadGallery ── UploadedImageRef[] sourced from Supabase Storage
  └── iconSearch   ── IconifySearchResult[] from Iconify API

Supabase Storage
  └── bucket: user-uploads
        └── {userId}/                                  (per-user folder prefix)
              └── {timestamp}-{nanoid}.{ext}          (one object per UploadedImageRef)
```

---

## Validation Rules Summary

| Rule | Source | Enforcement |
|---|---|---|
| Only 1 tool active at a time | FR-003 | `EditorShellStateModel.activeTool` is a single value |
| Image MIME in `{jpeg, png, webp, svg}` | FR-023a | `ImageUploadService.validate()` |
| Image size ≤ 10 MiB | FR-023b | `ImageUploadService.validate()` |
| Dimension warning above 4000×4000 | FR-023c | `ImageUploadService.validate()` (non-blocking) |
| History ≤ 100 entries per face | Research §1 | `CanvasHistoryService` LRU |
| History scoped per `pageId` | §1 | Face switch does not mix entries |
| Multi-selection hides full toolbar | FR-039 | `FloatingToolbarController.resolveFor()` |
| Edit panel label ≤ ~20 chars | FR-010 | `EditablePanelField.label` generator |
| WCAG 2.1 AA contrast on chrome | FR-040..FR-043 | CSS tokens + axe checks during implementation |

---

## Out of Scope (Phase 1)

- Collaborative editing / concurrent edit conflict resolution
- Version history (timeline beyond in-memory undo/redo)
- Offline canvas persistence beyond the existing auto-save
- Image transformation (crop/filter beyond the placeholder toolbar controls — implementation detail for the Image panel, not a data model concern)
- Server-side image moderation or virus scanning
