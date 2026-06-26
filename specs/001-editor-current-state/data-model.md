# Data Model: Editor Current State

**Branch**: `001-editor-current-state` | **Date**: 2026-04-11  
**Source**: `src/app/modules/shared/domaine/entities/art.ts` + codebase inspection

---

## Core Entities

### IArtDoc

The top-level document entity. Stored in Supabase (`art_docs` table). Loaded into NGXS store on editor open.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `any` | Yes | Supabase row ID |
| `original_id` | `string` | No | Reference to template source |
| `name` | `string` | Yes | Internal name |
| `title` | `string` | Yes | Display title |
| `description` | `string` | Yes | Description |
| `categorie` | `string` | Yes | Category (used for grouping/filtering) |
| `pages` | `IArtPage[]` | Yes | Array of faces (1–2 elements: front + optional back) |
| `status` | `string` | Yes | e.g. `'draft'`, `'published'` |
| `width` | `number` | Yes | Canvas logical width (px) |
| `height` | `number` | Yes | Canvas logical height (px) |
| `is_premuim` | `boolean` | Yes | Premium content flag |
| `is_3d` | `boolean` | Yes | 3D art flag |
| `exported_times` | `number` | Yes | Download counter |
| `tags` | `string[]` | No | Searchable tags |
| `size` | `string` | No | Human-readable size descriptor |
| `reviews` | `IReview[]` | Yes | User reviews array |
| `preview_realized_art` | `any` | Yes | Preview image reference |
| `generated_preview_url` | `string` | No | Supabase Storage URL for auto-generated preview |
| `thumbnails` | `string` | No | Thumbnail image URL |
| `video` | `string` | No | Video preview URL |
| `firestore_id` | `string` | No | Legacy Firestore reference |
| `type` | `'original' \| 'copy'` | No | Template vs. user copy distinction |

**Constraints**:
- `pages.length` is 1 (front only) or 2 (front + back). Maximum 2 pages enforced in `PagesSelectorComponent.canAddBack`.
- `width` and `height` drive canvas sizing and zoom calculations.

---

### IArtPage

A single face of the art document (front or back). Stored as a JSONB array within `IArtDoc.pages`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | No | Unique face ID (nanoid) |
| `name` | `string` | No | Face name (e.g. `'front'`, `'back'`) |
| `side` | `string` | Yes | Canonical side identifier: `'front'` or `'back'` |
| `canvasContent` | `any` | No | Fabric.js serialized JSON (`canvas.toObject()` output) |
| `preview` | `string` | No | Base64 or URL of face preview image |
| `backgroundColor` | `string` | No | Canvas background color |
| `selectedObj` | `any` | No | Last selected object reference (ephemeral, not used for rendering) |
| `size` | `string` | No | Size descriptor override |

**State transitions**:
- On face activation: `canvas.loadFromJSON(page.canvasContent)` → canvas renders face objects
- On canvas change: `canvasContent` updated in memory; persisted via auto-save or manual Save Art
- Empty face: `canvasContent` is `null`, `undefined`, or `{}` → canvas renders blank

---

### Canvas Object (Fabric.js)

Not a TypeScript interface — these are Fabric.js runtime objects stored inside `canvasContent`. Key types observed:

| Fabric.js Type | Editor usage | Property editors triggered |
|---|---|---|
| `IText` | Editable text object | Font, Size, Color, Align, Spacing, Opacity, Position |
| `Textbox` | Multi-line editable text | Font, Size, Color, Align, Spacing, Opacity, Position |
| `FabricImage` | Raster images (decorative, imported) | Box Shadow, Position, Opacity |
| `Group` (SVG) | SVG decorative elements | Box Shadow, Position, Opacity, SVG Color |
| `Group` (objects) | Grouped canvas objects | (Ungroupable via Actions menu) |

**Global Fabric.js object defaults** (set in `ngAfterViewInit`):
- `borderColor`: `#00b4d8`
- `cornerColor`: `#023e8a`
- `cornerStyle`: `'rect'`
- `cornerSize`: `5`
- `transparentCorners`: `false`
- `cornerStrokeColor`: `'black'`
- `borderDashArray`: `[4, 2]`
- `padding`: `0`

---

### ISelectedObj (runtime only)

Internal editor state — not persisted.

| Field | Type | Notes |
|---|---|---|
| `item` | `any` | Reference to active Fabric.js object |
| `id` | `string` | Object ID |
| `type` | `string` | Object type string: `'IText'`, `'Textbox'`, `'image'`, `'group'` |

---

### ISessionUserModel (runtime only)

User session from Supabase auth.

| Field | Type | Notes |
|---|---|---|
| `user.app_role` | `string` | `'admin'` gates Save Art and Actions menu |
| `user.photoURL` | `string` | Avatar image URL |

---

## State & Relationships

```
IArtDoc (1)
  └── pages: IArtPage[] (1..2)
        └── canvasContent: FabricJSON
              └── objects: FabricObject[] (0..n)
                    ├── IText / Textbox
                    ├── FabricImage
                    └── Group (SVG or grouped objects)
```

**Active page selection**: Managed via `selectedPageIndexSubj` (BehaviorSubject in `pages-selector.component.ts`). Index 0 = front, index 1 = back.

---

## Canvas Event Bus (CanvasUtilsService)

Not a persisted entity — inter-component communication channel.

### `IEditorEvent`
```typescript
interface IEditorEvent {
  name: string;   // Property name to update (e.g. 'fontFamily', 'fontSize')
  value: any;     // New value
}
```

### `IEditorEventAdd`
```typescript
interface IEditorEventAdd {
  name: 'addImage' | 'addForm';  // Operation type
  value: any;                     // Image object or form shape name
}
```

**Flow**: Tab/editor component → `canvasUtilService.setAddElementEvent(event)` → `AuthorLayoutComponent` subscribed to `addElementEvent$` → applies to canvas.
