# Research: Editor Current State — Codebase Audit Findings

**Branch**: `001-editor-current-state` | **Date**: 2026-04-11  
**Method**: Direct codebase inspection (no speculative research required — all NEEDS CLARIFICATION items resolved by reading source)

---

## Technology Stack

### Decision: Angular 19.2.x standalone components
- **Rationale**: Already in use. All editor components are standalone (`standalone: true`). No NgModules in the editor path except the legacy `AuthorEntryModule` routing shim.
- **Alternatives considered**: N/A (audit — not a new choice)

### Decision: Fabric.js 6.6.1
- **Rationale**: Already in use. Canvas is initialized on `<canvas id="fabricSurface">`. Objects are `IText`, `Textbox`, `FabricImage`, `Group`, and SVG paths. Object defaults (selection border, corner style) are set globally in `ngAfterViewInit`.
- **Key API surface observed**: `canvas.loadFromJSON()`, `canvas.add()`, `canvas.requestRenderAll()`, `canvas.getActiveObject()`, `canvas.setZoom()`, `FabricObject.ownDefaults`, `Control`

### Decision: NGXS 20.1 for state management
- **Rationale**: Already in use. `ArtFacadeService` wraps NGXS actions/selectors; components interact only with the facade.
- **Storage plugin**: `@ngxs/storage-plugin` installed (persists state to localStorage).

### Decision: Supabase as backend
- **Rationale**: `@supabase/supabase-js 2.53` is the data layer. `ArtDocsService` uses `supabaseService.client` for all database reads/writes. Firebase Storage references exist in some service files but the primary backend is Supabase.
- **Save Art flow**: `artDocService.updateArtDocPages(artDoc)` → Supabase upsert on the art_docs table.

### Decision: ng-zorro-antd 17.2 (Ant Design for Angular)
- **Rationale**: All UI chrome (drawers, dropdowns, buttons, icons, tabs, spinner, modal) comes from ng-zorro-antd. Bootstrap 5.3.2 is also present for layout utilities.

---

## Architecture Findings

### Root editor component: `AuthorLayoutComponent`
- File: `src/app/modules/author/components/author/author.component.ts`
- ~500+ lines; handles canvas lifecycle, Fabric.js event bindings, tab navigation, save logic, keyboard shortcuts, and dynamic component loading.
- All bottom-drawer property editors (font, size, color, etc.) are loaded **dynamically** via `*ngComponentOutlet` — no static template references.

### Two distinct "save" paths
1. **Admin save** (`saveArt()`): Explicit button, admin-only (gated by `isAdmin$`). Calls `artDocService.updateArtDocPages(artDoc)` — saves the entire `IArtDoc` with all pages to Supabase.
2. **User auto-save** (`saveUserArt()`): Triggered automatically on canvas change events for non-admin users. Calls `newArtFacade.updateUserArtDocFace(pageId, updates)` — saves only the current face (`canvasContent` + `preview`).

### Face/page switcher: `PagesSelectorComponent`
- File: `src/app/modules/author/components/pages-selector/pages-selector.component.ts`
- Exposed via a **right-side slide-out drawer** (`nzDrawer`, 200px wide). Opened by clicking a `>>` toggle button (`open-page-drawer`).
- Uses a shared `BehaviorSubject` (`selectedPageIndexSubj`) as the inter-component bus for the active page index.
- Supports up to 2 pages (front + back). `canAddBack` gate: `pages.length < 2`.
- Methods: `selectPage(index)`, `addBackPage()`, `removePage()`.

### Bottom tab system: "Add-in menu bar"
- Controlled by `isAddInMenuBarre` flag in `AuthorLayoutComponent` (default `true`).
- 4 tabs rendered directly in `author.component.html`: Text, Elements, Marque, Import.
- Clicking a tab calls `openAddInMenu(name)` which opens a bottom `nzDrawer` and loads the corresponding component dynamically.
- **Marque tab** (`AddMarqueComponent`): Empty stub — no implementation in component or template.
- **Import tab** (`AddImportComponent`): Empty stub. The actual image import is handled directly in `AuthorLayoutComponent` via `triggerFileInput()` / `onFileSelected()` — loads image files (not JSON) onto the canvas as `FabricImage` objects.

### Contextual property editor system
When a canvas object is selected, `isElementSelected = true` and `listEditorComponentsMenu` is populated with property editors based on object type:
- **Text** (`IText`/`Textbox`): Font family, font size, text color, format/align, letter spacing, opacity, position
- **Image** (`FabricImage`): Box shadow, position, opacity
- **SVG** (`Group`): Box shadow, position, opacity, SVG color
- **Canvas back** (no selection): Background color

Each editor is loaded into a bottom `nzDrawer` via `*ngComponentOutlet`.

### Canvas event bus: `CanvasUtilsService`
- File: `src/app/modules/shared/canvas/canvas.utils.service.ts`
- Two `BehaviorSubject` channels:
  - `editorEvent$`: property update events from editor components → canvas
  - `addElementEvent$`: add-element events from tab components → canvas

### Actions menu (admin-only)
Dropdown items: ungroup, group, lockMovement, unlockMovement, Mask, UndoMask, DuplicateObject, Download JSON

### Share button
- Calls `openShareMenu()` → opens `ShareOptionsComponent` in a drawer.
- `SharePublicLinkComponent` also present for public link sharing.

### Download
- `DownloadOptionsComponent` handles PDF, JPEG, PNG export.
- Canvas PDF via `canvasPdf.service.ts`.

### Canvas sizing
- Canvas dimensions driven by `artDoc.width` × `artDoc.height`.
- Responsive zoom: `Math.min(containerWidth / artDoc.width, containerHeight / artDoc.height)`.
- Canvas element: `<canvas id="fabricSurface">`.

---

## Corrections to Spec (vs. clarification session answers)

| Spec statement | Actual code behavior |
|---|---|
| "Import tab — imports external Fabric.js JSON" | Import tab stub is empty; actual import adds **image files** (JPEG/PNG) to canvas as FabricImage objects via a hidden `<input type="file">` |
| "Marque tab — brand/logo stamp tool" | `AddMarqueComponent` is a completely empty stub; no implementation |
| "Save Art — saves to backend API" | Correct, but admin-only. Non-admin users have auto-save via `saveUserArt()` |
| "Face switcher — visible UI control" | Correct. Accessed via a `>>` toggle that opens a right-side slide-out drawer |
| "Bottom tabs are the only navigation mechanism" | Accurate; the face switcher drawer is a separate mechanism outside the 4-tab bottom bar |
