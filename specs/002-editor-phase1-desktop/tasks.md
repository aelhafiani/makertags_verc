---
description: "Task list for Editor Phase 1 — Desktop Redesign"
---

# Tasks: Editor Phase 1 — Desktop Redesign

**Input**: Design documents from `/specs/002-editor-phase1-desktop/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/editor-shell.md, contracts/canvas-history.md, contracts/image-upload.md, contracts/iconify-adapter.md

**Tests**: The spec does not request TDD. Included test tasks are limited to the ones explicitly called out in plan.md (service unit tests) and a single integration test for the MVP panel. Additional tests are deferred to the Polish phase.

**Organization**: Tasks are grouped by user story (US1–US10 from spec.md) so each can be implemented, tested, and demoed independently after Setup + Foundational are complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1..US10) — required for user-story-phase tasks
- All file paths are repository-relative

## Path Conventions

Existing Angular SPA. New code lives under:
- `src/app/modules/author/components/shell/` — editor shell chrome
- `src/app/modules/author/components/panels/` — 7 tool panels
- `src/app/modules/author/services/` — new services + NGXS sub-state
- `src/styles.scss` — global a11y + focus CSS

Preserved from existing codebase:
- `src/app/modules/shared/services/new-art.facade.ts` (NGXS facade)
- `src/app/modules/shared/services/art-docs.service.ts` (Supabase CRUD)
- `src/app/modules/shared/canvas/canvas.utils.service.ts` (event bus for legacy editors)
- `src/app/modules/author/components/pages-selector/pages-selector.component.ts` (face switcher)
- Legacy property-editor sub-components (font, color, align, etc.) — reused inside the new floating toolbar

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new directory tree, verify third-party deps, and provision external infrastructure.

- [X] T001 Create empty directory scaffolding for the new editor shell and panels at `src/app/modules/author/components/shell/`, `src/app/modules/author/components/shell/left-sidebar/`, `src/app/modules/author/components/shell/contextual-panel/`, `src/app/modules/author/components/shell/floating-toolbar/`, `src/app/modules/author/components/shell/topbar/`, `src/app/modules/author/components/shell/mini-preview-column/`, `src/app/modules/author/components/panels/edit-panel/`, `src/app/modules/author/components/panels/add-text-panel/`, `src/app/modules/author/components/panels/add-image-panel/`, `src/app/modules/author/components/panels/background-panel/`, `src/app/modules/author/components/panels/elements-panel/`, `src/app/modules/author/components/panels/icons-panel/`, `src/app/modules/author/components/panels/layers-panel/`, and `src/app/modules/author/services/` — no files yet, just the folders.
- [ ] T002 [P] Verify `@angular/cdk` (drag-drop, a11y, overlay) is resolvable via the existing ng-zorro-antd dependency tree by importing `DragDropModule`, `A11yModule`, and `OverlayModule` in a throwaway spec; if imports fail, add `@angular/cdk@^19.0.0` as a direct dependency in `package.json` and run `yarn install`.
- [ ] T003 [P] Provision the Supabase Storage bucket `user-uploads` (public read, authenticated write) and apply the three RLS policies from `specs/002-editor-phase1-desktop/contracts/image-upload.md` §Bucket policy. Deliverable: either a new SQL migration under `supabase/migrations/` or a documented dashboard change logged in `specs/002-editor-phase1-desktop/research.md` §9.
- [X] T004 [P] Add global CSS tokens for WCAG 2.1 AA in `src/styles.scss`: `:focus-visible` outline using the existing brand color `#00b4d8`, `.sr-only` screen-reader class for the ARIA live region, and any contrast overrides for ng-zorro-antd tokens that fail 4.5:1.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services, NGXS state, editor shell scaffold, and routing — everything the user stories build on. The shell loads the canvas, wires auto-save, and opens the Edit panel by default (FR-006) so User Story 1 can be verified without needing the sidebar built first.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T005 Create NGXS sub-state `EditorShellState` in `src/app/modules/author/services/editor-shell.state.ts` with the `EditorShellStateModel` shape from data-model.md and the actions `SetActiveTool`, `SetSelection`, `SetSaveStatus`, `SetHistoryButtons`, `SetUploadGallery`, `SetIconSearch`. Register the state with `@ngxs/store` in the existing app store module alongside the current art-doc slice.
- [X] T006 [P] Implement `CanvasHistoryService` in `src/app/modules/author/services/canvas-history.service.ts` per `specs/002-editor-phase1-desktop/contracts/canvas-history.md`: `attach`, `detach`, `push`, `undo`, `redo`, `clear`, `canUndo$`, `canRedo$`, internal `FaceHistory` map, LRU cap of 100, snapshot via `canvas.toObject(HISTORY_SNAPSHOT_KEYS)`, replay guard via `isReplaying` flag, Fabric event bindings (`object:added`, `object:removed`, `object:modified`, `text:changed` with 500ms debounce).
- [X] T007 [P] Implement `ImageUploadService` in `src/app/modules/author/services/image-upload.service.ts` per `specs/002-editor-phase1-desktop/contracts/image-upload.md`: `validate(file)` (MIME/size/dimension checks with `createImageBitmap` for raster and SVG parsing for vectors), `upload(file)` (path `{userId}/{timestamp}-{nanoid(8)}.{ext}` → Supabase Storage bucket `user-uploads` → `getPublicUrl`), `listUserUploads()`, `remove(ref)`, plus the `ImageUploadValidationError` and `ImageUploadNetworkError` classes.
- [X] T008 [P] Implement `IconifyAdapterService` in `src/app/modules/author/services/iconify-adapter.service.ts` per `specs/002-editor-phase1-desktop/contracts/iconify-adapter.md`: `search(query, limit)`, `fetchSvg(id, color)`, `clearCache()`, two `Map`-based caches (search key `${query}:${limit}`, SVG key `${id}:${color ?? ''}`), direct `fetch()` against `https://api.iconify.design`, `IconifyNetworkError` class with status-to-message mapping.
- [X] T009 [P] Implement `FloatingToolbarController` in `src/app/modules/author/services/floating-toolbar.controller.ts` with a single pure method `resolveFor(object: FabricObject, isMultiSelection: boolean): FloatingToolbarDescriptor` that maps object type → control set (text → fontSize/fontFamily/bold/italic/textAlign/color/delete; image → crop/replace/flipH/flipV/delete; shape → fill/border/opacity/delete; svg → fill/opacity/delete; multi → delete-only per FR-039) and computes `anchorRect` from `object.getBoundingRect()`.
- [X] T010 Create `CanvasProviderService` in `src/app/modules/author/services/canvas-provider.service.ts` as an injectable singleton that exposes `canvas: fabric.Canvas | null`, `canvas$: Observable<fabric.Canvas>`, and `selection$: Observable<{ objectId, objectType, isMultiSelection }>` — this is the single DI point panels use instead of keeping private canvas references (per contracts/editor-shell.md §Template contract for child panels).
- [X] T011 Scaffold `EditorShellComponent` as a standalone component at `src/app/modules/author/components/shell/editor-shell.component.ts` with `ChangeDetectionStrategy.OnPush`, inject `CanvasProviderService`, `CanvasHistoryService`, `ArtFacadeService`, and NGXS `Store`; declare an `@ViewChild('fabricSurface')` for the canvas element and an `@ViewChild('liveRegion')` for the ARIA live region.
- [X] T012 Build `EditorShellComponent` template in `src/app/modules/author/components/shell/editor-shell.component.html` as a CSS grid with four zones (72px sidebar, 260px panel lane, flexible canvas, 140px preview column), plus `<div aria-live="polite" class="sr-only" #liveRegion></div>`. Canvas element: `<canvas id="fabricSurface" #fabricSurface></canvas>`.
- [X] T013 In `EditorShellComponent.ngAfterViewInit()`, initialize `new fabric.Canvas('fabricSurface')`, load `IArtDoc` via `ArtFacadeService.selectOrCreateArtDoc(id)`, call `canvas.loadFromJSON(activePage.canvasContent)`, register the canvas with `CanvasProviderService`, and call `canvasHistory.attach(canvas, activePage.id)`. Bind `selection:created`, `selection:updated`, `selection:cleared` to dispatch `SetSelection` NGXS actions.
- [X] T014 Create `MiniPreviewColumnComponent` at `src/app/modules/author/components/shell/mini-preview-column/mini-preview-column.component.ts` that mounts the existing `PagesSelectorComponent` (front/back face switcher) and listens to `selectedPage$` from the existing module; on face change call `canvasHistory.detach()`, `canvas.loadFromJSON(newFace.canvasContent)`, then `canvasHistory.attach(canvas, newFace.id)`.
- [X] T015 Dispatch `SetActiveTool('edit')` in `EditorShellComponent` once the canvas is ready, satisfying FR-006 (Edit panel opens by default on template load).
- [X] T016 Add a parallel route `/author/v2/:id` in `src/app/modules/author/components/author-entry/author-entry-routing.module.ts` targeting `EditorShellComponent`. Leave the existing `/author/:id` → `AuthorLayoutComponent` route untouched until the final polish phase swap.
- [ ] T017 [P] Unit tests for `CanvasHistoryService` in `src/app/modules/author/services/canvas-history.service.spec.ts`: valid push/undo/redo for each `HistoryActionType`, LRU drop on the 101st push, redo-stack clear on new push, face-scoped isolation, `isReplaying` guard prevents recursive pushes.
- [ ] T018 [P] Unit tests for `ImageUploadService` in `src/app/modules/author/services/image-upload.service.spec.ts` with a mocked `SupabaseService`: MIME rejection, size rejection, dimension warning (non-blocking), successful upload path, anonymous-user path rejection.
- [ ] T019 [P] Unit tests for `IconifyAdapterService` in `src/app/modules/author/services/iconify-adapter.service.spec.ts` with `fetch` spied: search cache hit avoids a second network call, SVG cache hit, `IconifyNetworkError` on non-2xx, empty-query short-circuit.

**Checkpoint**: Foundation ready. `CanvasProviderService`, `EditorShellComponent`, and `CanvasHistoryService` are wired together; the Edit panel slot is reserved and `SetActiveTool('edit')` fires on load; user-story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Personalize Template Text Fields (Priority: P1) 🎯 MVP

**Goal**: Users can open a template and edit all IText/Textbox objects via an auto-generated form in the Edit panel, then click Apply Changes to update the canvas.

**Independent Test**: Load a template with 3 IText/Textbox objects; verify 3 labeled inputs appear in the Edit panel pre-filled with current text; type new values, click Apply Changes, and verify the canvas text objects update. Empty-state: load a template with no text objects and verify the empty message renders.

### Implementation for User Story 1

- [X] T020 [P] [US1] Define the `EditablePanelField` interface and a `buildFieldsFromCanvas(canvas: fabric.Canvas): EditablePanelField[]` helper in `src/app/modules/author/components/panels/edit-panel/edit-panel.types.ts` — filter `canvas.getObjects()` for `i-text` and `textbox`, derive label from first ~20 characters of `text`, fallback to `"Text field {index}"` when empty (FR-010).
- [X] T021 [US1] Implement `EditPanelComponent` as a standalone component at `src/app/modules/author/components/panels/edit-panel/edit-panel.component.ts`: inject `CanvasProviderService` and `CanvasHistoryService`, call `buildFieldsFromCanvas(canvas)` in `ngOnInit`, build a reactive `FormGroup` keyed by `objectId` (FR-007, FR-008).
- [X] T022 [US1] Build `EditPanelComponent` template at `src/app/modules/author/components/panels/edit-panel/edit-panel.component.html`: render `<nz-input>` for `i-text` fields and `<textarea nz-input>` for `textbox` fields (FR-009), with the derived label as an `<label>` above each control; include an "Apply changes" `<button nz-button nzType="primary">` and an empty state `<nz-empty>` when `fields.length === 0` (FR-012).
- [X] T023 [US1] Implement the Apply Changes handler in `EditPanelComponent.applyChanges()`: iterate the form values, for each changed field call `fabricObject.set('text', newValue)`, then `canvas.requestRenderAll()` and `canvasHistory.push('text:changed')` (FR-011). Publish "Text fields updated" to the ARIA live region via `PanelContext.announce`.
- [X] T024 [US1] Wire `EditPanelComponent` into the contextual-panel host so that dispatching `SetActiveTool('edit')` renders it. For Foundational-phase testing, the contextual-panel host can be a minimal `<ng-container *ngComponentOutlet>` — the full animation/host behavior ships in US2.
- [ ] T025 [US1] Integration test in `src/app/modules/author/components/panels/edit-panel/edit-panel.component.spec.ts` using a real in-memory `fabric.Canvas` populated with 3 IText/Textbox objects: verify 3 labeled inputs render, pre-fill matches `text`, an empty-text object gets a `"Text field N"` label, Apply Changes mutates the Fabric objects, and the empty-state message renders when the canvas has no text objects (acceptance scenarios 1–5).

**Checkpoint**: MVP complete. User Story 1 is independently demoable at `/author/v2/:id` with a real template.

---

## Phase 4: User Story 2 — Sidebar Navigation (Priority: P2)

**Goal**: Users can switch between the 7 tools via a vertical left sidebar; only one panel is open at a time; clicking the active tool again closes it; all navigation is keyboard-operable.

**Independent Test**: Click each of 7 sidebar icons and verify the corresponding panel opens with a slide animation; click the active icon again and verify the panel closes; Tab into the sidebar, press ArrowDown, and verify focus moves between tool icons; press Escape while a panel is open and verify it closes.

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create `LeftSidebarComponent` as a standalone component at `src/app/modules/author/components/shell/left-sidebar/left-sidebar.component.ts` with a hardcoded `tools: Array<{ id: ToolId; icon: string; label: string }>` list of the 7 tools (Edit, Add Text, Add Image, Background, Elements, Icons, Layers).
- [ ] T027 [US2] Build `LeftSidebarComponent` template at `src/app/modules/author/components/shell/left-sidebar/left-sidebar.component.html`: 7 `<button>` elements with `nz-icon` children, `aria-label` from `tools[i].label`, `[attr.aria-pressed]` bound to `activeTool === tool.id`, and a `tabindex` managed via Angular CDK `FocusKeyManager` for roving-tabindex keyboard navigation.
- [ ] T028 [US2] Wire sidebar button click and Enter/Space key handlers to dispatch `SetActiveTool(tool.id)` to NGXS; subscribe to `EditorShellState.activeTool` with an async pipe for active-state class binding.
- [ ] T029 [US2] Create `ContextualPanelHostComponent` at `src/app/modules/author/components/shell/contextual-panel/contextual-panel.component.ts` that subscribes to `EditorShellState.activeTool`, maps it to a panel component class via a `TOOL_TO_COMPONENT` record, and renders via `*ngComponentOutlet`. Apply an Angular animation trigger `@slideInOut` (260ms ease-out) on the panel wrapper (FR-004). Enforce single-panel-open by design — only one slot exists.
- [ ] T030 [US2] In `EditorShellComponent`, add a `@HostListener('document:keydown.escape')` that dispatches `SetActiveTool(null)` when a panel is open.
- [ ] T031 [US2] In `EditorShellComponent`, subscribe to `EditorShellState.activeTool` changes and publish `"{Tool} panel opened"` / `"Panel closed"` messages to the ARIA live region (FR-042).

**Checkpoint**: User Stories 1 and 2 work together — the Edit panel is still openable by default, and the sidebar can now toggle any panel (even placeholder ones).

---

## Phase 5: User Story 3 — Add & Style Free Text on Canvas (Priority: P3)

**Goal**: Users can add a free text element via a text prompt and via quick-style presets (Heading, Subheading, Body, Cursive).

**Independent Test**: Open the Text panel, click "Add a text box", enter text, confirm → new IText appears on canvas and is reflected in the Edit panel's list. Click each quick style → distinct typographic IText objects appear.

### Implementation for User Story 3

- [ ] T032 [P] [US3] Create `AddTextPanelComponent` as a standalone component at `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` with a `QUICK_STYLES` constant containing at least 4 presets (per FR-022): Heading (e.g. 36px bold sans), Subheading (24px semibold), Body (16px regular), Cursive (28px script family).
- [ ] T033 [US3] Implement "Add a text box" action: render an inline `<input>` prompt, on confirm create `new IText(value, { left, top })` centered on the canvas, call `canvas.add(obj)`, `canvas.setActiveObject(obj)`, `canvas.requestRenderAll()`, then `canvasHistory.push('object:added')`.
- [ ] T034 [US3] Implement quick-style buttons: each button calls a `createStyledText(preset)` helper that instantiates `new IText(preset.placeholderText, { fontFamily, fontSize, fontWeight, fontStyle })` and adds it via the same flow as T033.
- [ ] T035 [US3] Register `AddTextPanelComponent` in the `TOOL_TO_COMPONENT` map from T029 so the sidebar's Add Text icon renders it.

**Checkpoint**: US3 complete. New text objects flow through the same history and selection pipelines.

---

## Phase 6: User Story 4 — Floating Contextual Toolbar (Priority: P4)

**Goal**: When a canvas object is selected, a floating toolbar appears above it with type-appropriate controls. Repositions to below if it would overflow above. Hides on deselection. Multi-selection shows only delete.

**Independent Test**: Click a text object → toolbar appears within 200ms with text controls; change font size via the toolbar → canvas updates in real time; drag the object near the top edge → toolbar repositions below; click empty canvas → toolbar disappears; select multiple objects → only delete is shown.

### Implementation for User Story 4

- [ ] T036 [P] [US4] Create `FloatingToolbarComponent` as a standalone component at `src/app/modules/author/components/shell/floating-toolbar/floating-toolbar.component.ts`. Inject `CanvasProviderService`, `FloatingToolbarController`, `CanvasHistoryService`, Angular CDK `Overlay`, and `OverlayPositionBuilder`.
- [ ] T037 [US4] Subscribe to `CanvasProviderService.selection$` in `FloatingToolbarComponent.ngOnInit()`; on selection, call `controller.resolveFor(object, isMulti)` to get the descriptor, then create a CDK overlay with `FlexibleConnectedPositionStrategy` anchored to the canvas element at `descriptor.anchorRect`, with preferred position above-center and fallback below-center (FR-013, FR-016).
- [ ] T038 [US4] On `selection:cleared` detach the overlay (FR-015); for `isMultiSelection`, only attach when the descriptor contains the `delete` control and no others (FR-039).
- [ ] T039 [US4] Build the text-control sub-template in `src/app/modules/author/components/shell/floating-toolbar/floating-toolbar.component.html`: reuse existing `FontFamilyEditorComponent`, `TextEditorSizeComponent`, `ColorEditorTextComponent`, `TextAlignEditorComponent`, and `TextStyleComponent` via `*ngComponentOutlet` — these already publish to `CanvasUtilsService.editorEvent$` which the shell consumes to mutate the active object. Add a delete button that calls `canvas.remove(activeObject)` + `canvasHistory.push('object:removed')`.
- [ ] T040 [US4] Build the image-control sub-template: crop (stub for Phase 1, wired to a stretch task), replace (opens file picker → `ImageUploadService.upload()` → `activeObject.setSrc(url)`), flipH (`activeObject.set('flipX', !flipX)`), flipV (`flipY`), delete.
- [ ] T041 [US4] Build the shape-control sub-template: reuse existing `ColorEditorComponent` for fill, a new inline border/opacity set, delete. Keep it minimal — the control set is declared in the descriptor and rendered via a `@switch` branching on `control.kind`.
- [ ] T042 [US4] Instrument each control's commit moment (color-picker close, slider `change` event, input blur) to call `canvasHistory.push('style:changed')` — style changes must land in history, but intermediate slider values must not (per research §1).
- [ ] T043 [US4] Subscribe to `canvas.on('object:moving')` in `FloatingToolbarComponent` and recompute `descriptor.anchorRect` + update the overlay position strategy so the toolbar tracks the object during drag.

**Checkpoint**: US4 complete. The floating toolbar replaces the legacy bottom-drawer contextual editors.

---

## Phase 7: User Story 5 — Upload and Place Custom Images (Priority: P5)

**Goal**: Users can upload an image from their device (with MIME/size validation and non-blocking dimension warning) or pick one from the session gallery; uploaded images are persisted to Supabase Storage and reappear on page reload.

**Independent Test**: Upload a 2 MB JPEG → it appears on canvas as a FabricImage with `src` pointing at a `supabase.co/storage/...` URL; open Add Image panel again → uploaded image shows in the gallery; reload the page → gallery still shows it. Upload a 15 MB file → rejected with size error. Upload a `.txt` file → rejected with MIME error. Upload a 6000×6000 image → accepted with a warning.

### Implementation for User Story 5

- [ ] T044 [P] [US5] Create `AddImagePanelComponent` as a standalone component at `src/app/modules/author/components/panels/add-image-panel/add-image-panel.component.ts`. Inject `ImageUploadService`, `CanvasProviderService`, `CanvasHistoryService`, and `NzMessageService`.
- [ ] T045 [US5] Build the panel template with an "Upload from computer" `<button>` that triggers a hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml">`; on change, call `ImageUploadService.validate(file)` then `.upload(file)`.
- [ ] T046 [US5] Surface `ImageUploadValidationError` via `NzMessageService.error()` with the error message; for dimension warnings, show `NzMessageService.warning()` but proceed with upload (FR-023a, FR-023b, FR-023c).
- [ ] T047 [US5] On successful upload, call `fabric.Image.fromURL(ref.url, { crossOrigin: 'anonymous' })` → place at canvas center → `canvas.add(img)` → `canvas.setActiveObject(img)` → `canvasHistory.push('object:added')`.
- [ ] T048 [US5] Render a `Recent uploads` section: in `ngOnInit` call `ImageUploadService.listUserUploads()`, render each `UploadedImageRef` as a `<img>` thumbnail in a grid; clicking a thumbnail calls `fabric.Image.fromURL(ref.url)` with the same placement flow as T047 (FR-024).
- [ ] T049 [US5] Show loading skeleton while `listUserUploads()` is pending; show `<nz-empty>` when the gallery is empty; show an error state (with retry button) if the Supabase list fails.

**Checkpoint**: US5 complete. Uploaded images persist across sessions.

---

## Phase 8: User Story 6 — Background Panel (Priority: P6)

**Goal**: Users can change the canvas background to a solid color (from a swatch palette, recent colors, or hex input) or upload a background image, and can remove the background entirely.

**Independent Test**: Open Background panel → click a swatch → canvas background changes; enter `#ff5500` in the hex input → canvas background changes; upload a background image → canvas background becomes the image; click Remove → background reverts.

### Implementation for User Story 6

- [ ] T050 [P] [US6] Create `BackgroundPanelComponent` as a standalone component at `src/app/modules/author/components/panels/background-panel/background-panel.component.ts`. Inject `CanvasProviderService`, `ImageUploadService`, `CanvasHistoryService`.
- [ ] T051 [US6] Build the template with a 5×4 swatch grid (hardcoded brand palette), a `recentColors: string[]` section stored in `EditorShellState` (last 8 used), and an `<nz-color-picker>` or `<input type="color">` for custom values. Wire each color selection to `canvas.backgroundColor = color; canvas.requestRenderAll()` (FR-025).
- [ ] T052 [US6] Add an "Upload background image" button reusing `ImageUploadService.upload()`; on success call `canvas.set('backgroundImage', await fabric.FabricImage.fromURL(ref.url))` then `canvas.requestRenderAll()` (FR-026).
- [ ] T053 [US6] Add a "Remove" button that calls `canvas.set('backgroundColor', null); canvas.set('backgroundImage', null); canvas.requestRenderAll()` (FR-027).
- [ ] T054 [US6] After each background mutation, call `canvasHistory.push('background:changed')`.

**Checkpoint**: US6 complete.

---

## Phase 9: User Story 7 — Elements Panel (Priority: P7)

**Goal**: Users can add basic shapes (Rect, rounded Rect, Circle, Triangle) and browse/search a graphics grid sourced from the existing `ArtDocsService.getImagesByCategotiries()` feed.

**Independent Test**: Click a shape button → shape appears centered on canvas; click a graphic thumbnail → graphic appears on canvas; type in the search bar → grid filters.

### Implementation for User Story 7

- [ ] T055 [P] [US7] Create `ElementsPanelComponent` as a standalone component at `src/app/modules/author/components/panels/elements-panel/elements-panel.component.ts`. Inject `CanvasProviderService`, `ArtDocsService`, `CanvasHistoryService`.
- [ ] T056 [US7] Render four dynamic shape buttons (Rect, Rect with `rx: 12, ry: 12`, Circle, Triangle). Each button instantiates the corresponding Fabric.js shape with sensible defaults (size 120px, fill `#888`, centered), calls `canvas.add()`, `canvas.setActiveObject()`, `canvasHistory.push('object:added')` (FR-028).
- [ ] T057 [US7] Call `ArtDocsService.getImagesByCategotiries()` in `ngOnInit`, render the results as a grid grouped by `categorie` (FR-029). Clicking a thumbnail calls `fabric.FabricImage.fromURL(img.url)` → `canvas.add()` → history push.
- [ ] T058 [US7] Add an `<nz-input>` search bar that filters the grid client-side by `image.name.toLowerCase().includes(query)` (FR-030).

**Checkpoint**: US7 complete.

---

## Phase 10: User Story 8 — Icons Panel (Priority: P8)

**Goal**: Users can search Iconify, pick a color, and place colored SVG icons on the canvas as Fabric.js Groups.

**Independent Test**: Type "heart" → grid populates with heart icons; pick a color and click an icon → icon is placed on canvas with the chosen fill; search "heart" again → instant (cache hit, no network); disconnect network and search → user-friendly error surfaces.

### Implementation for User Story 8

- [ ] T059 [P] [US8] Create `IconsPanelComponent` as a standalone component at `src/app/modules/author/components/panels/icons-panel/icons-panel.component.ts`. Inject `IconifyAdapterService`, `CanvasProviderService`, `CanvasHistoryService`, `NzMessageService`.
- [ ] T060 [US8] Build an `<nz-input>` search bar debounced by 300ms (RxJS `debounceTime`) that dispatches `IconifyAdapterService.search(query)` and pushes results to `EditorShellState.iconSearch.results`.
- [ ] T061 [US8] Render the results grid with a loading indicator during `iconSearch.loading`, `<nz-empty>` for zero results, and an error banner for `iconSearch.error` (FR-033).
- [ ] T062 [US8] Add a color picker; on icon click call `iconify.fetchSvg(id, color)` → import `loadSVGFromString` and `util.groupSVGElements` from `fabric` → create a `Group` centered on the canvas → `canvas.add(group)` → `canvas.setActiveObject(group)` (FR-032).
- [ ] T063 [US8] After `canvas.add`, call `canvasHistory.push('object:added')`.

**Checkpoint**: US8 complete.

---

## Phase 11: User Story 9 — Layers Panel (Priority: P9)

**Goal**: Users can see all canvas objects as a draggable layer list, reorder by drag-and-drop, toggle visibility and lock, and click a layer to select the object.

**Independent Test**: Place 3 objects on the canvas → open Layers panel → see 3 items in `canvas.getObjects()`-reversed order; drag one to the top → `canvas.moveObjectTo()` updates stacking; toggle visibility → object hides; toggle lock → object can no longer be dragged on canvas; click a layer item → corresponding object becomes the active selection.

### Implementation for User Story 9

- [ ] T064 [P] [US9] Create `LayersPanelComponent` as a standalone component at `src/app/modules/author/components/panels/layers-panel/layers-panel.component.ts`. Inject `CanvasProviderService`, `CanvasHistoryService`. Import `DragDropModule` from `@angular/cdk/drag-drop`.
- [ ] T065 [US9] Derive the layer list in a computed signal or observable: `canvas.getObjects().slice().reverse()`. Re-derive on `object:added`, `object:removed`, and any history replay via a canvas event subscription (FR-034).
- [ ] T066 [US9] Build the template with `cdkDropList` and `cdkDrag` directives; in the `cdkDropListDropped` handler, invert indices (panel order is reversed) and call `canvas.moveObjectTo(obj, invertedIndex)` + `canvas.requestRenderAll()` + `canvasHistory.push('object:modified')` (FR-035).
- [ ] T067 [US9] Add per-layer visibility toggle button: `obj.set('visible', !obj.visible); canvas.requestRenderAll(); canvasHistory.push('layer:visibility')` (FR-036).
- [ ] T068 [US9] Add per-layer lock toggle button: set `lockMovementX`, `lockMovementY`, `lockScalingX`, `lockScalingY` all to `true` (or all to `false`) on the object, then `canvasHistory.push('layer:lock')` (FR-037).
- [ ] T069 [US9] Click handler on the layer row body: `canvas.setActiveObject(obj); canvas.requestRenderAll()` (FR-038) — the selection event will propagate through `CanvasProviderService.selection$` and trigger the floating toolbar.
- [ ] T070 [US9] Subscribe to `canvas.on('object:added')` and `canvas.on('object:removed')` so the panel list stays in sync when objects are added/removed from other panels or via history replay.

**Checkpoint**: US9 complete.

---

## Phase 12: User Story 10 — Topbar Redesign (Priority: P10)

**Goal**: A redesigned topbar with Save/Exit (left), title + save status + step tabs + undo/redo (center), and Preview + Next CTA (right); undo/redo buttons respect the history stack; save status updates in real time.

**Independent Test**: Open editor → all topbar elements render; make a change → save status indicator transitions Saving… → Saved; click Undo → last change reverses and button disables when stack is empty; click Next → step placeholder behavior.

### Implementation for User Story 10

- [ ] T071 [P] [US10] Create `TopbarComponent` as a standalone component at `src/app/modules/author/components/shell/topbar/topbar.component.ts`. Inject `Store` (NGXS), `CanvasHistoryService`, `ArtFacadeService`, `Router`.
- [ ] T072 [US10] Build the three-column template at `src/app/modules/author/components/shell/topbar/topbar.component.html`: left cluster (`Save and Exit` button), center cluster (art doc title from `IArtDoc.title`, save status indicator, Design/Options/Review `<nz-tabs>` as visible placeholders per Assumptions, undo + redo `<button>`s), right cluster (Preview + Next CTA) — per FR-018.
- [ ] T073 [US10] Subscribe the save status indicator to `EditorShellState.saveStatus` and the existing auto-save signal from `ArtFacadeService` (dispatch `SetSaveStatus` transitions as the facade emits). Announce `"Saving…"` / `"Saved"` to the ARIA live region on transitions (FR-019, FR-042).
- [ ] T074 [US10] Bind the Undo button to `canvasHistory.undo()` with `[disabled]="!(canUndo$ | async)"`, and the Redo button likewise. On click, announce `"Undid last change"` / `"Redid change"` via the live region (FR-020).
- [ ] T075 [US10] Wire "Save and Exit" to flush the pending auto-save (`ArtFacadeService.flushUserArtDocFace()` if available; otherwise `await` the last save observable) then `router.navigate(['/catalog'])` or the existing exit destination. Preview and Next CTAs can reuse the existing Preview drawer; the step `<nz-tabs>` emit no navigation in Phase 1.

**Checkpoint**: All 10 user stories are independently functional at `/author/v2/:id`.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Keyboard shortcuts, a11y audit, route swap, cleanup, and quickstart validation.

- [ ] T076 [P] Add keyboard shortcuts in `EditorShellComponent` via `@HostListener('document:keydown')`: `Ctrl+Z` / `Cmd+Z` → `canvasHistory.undo()`; `Ctrl+Shift+Z` / `Cmd+Shift+Z` → `canvasHistory.redo()`; `Delete` / `Backspace` (when canvas is focused and an object is selected) → `canvas.remove(activeObject)` + history push.
- [ ] T077 [P] Run `axe-core` (or `@axe-core/cli`) against `/author/v2/:id` in a dev build and fix any WCAG 2.1 AA violations in the shell, sidebar, panels, floating toolbar, and topbar (FR-040..FR-043). Document the run result in a short note under `specs/002-editor-phase1-desktop/` or commit message.
- [ ] T078 [P] Add integration tests for the complex panels that were skipped during story phases: `floating-toolbar.component.spec.ts` (descriptor resolution + overlay attach/detach), `layers-panel.component.spec.ts` (drag-drop reorder + visibility/lock), `add-image-panel.component.spec.ts` (validation flow with mocked `ImageUploadService`).
- [ ] T079 Walk through every manual smoke test in `specs/002-editor-phase1-desktop/quickstart.md` against the dev server; log any failures and fix them. Do not proceed to T080 until the quickstart passes end-to-end.
- [ ] T080 Swap the primary route: in `src/app/modules/author/components/author-entry/author-entry-routing.module.ts`, change `/author/:id` to target `EditorShellComponent` and move the old `AuthorLayoutComponent` to `/author/legacy/:id` (or remove, depending on team decision during the task). Update any internal links from catalog/dashboard that point to the editor.
- [ ] T081 Remove dead code from the old bottom-tab flow once the route swap is stable: `AuthorLayoutComponent`'s bottom-drawer template blocks, `AddMarqueComponent` (empty stub per 001 audit), `AddImportComponent` (empty stub). Keep the reused property-editor sub-components (`font-family-editor`, `color-editor-text`, `text-editor-size`, etc.) — they are still consumed by the new floating toolbar.
- [ ] T082 Update `CLAUDE.md` Active Feature Branches table entry for `002-editor-phase1-desktop` from "Phase 1 design — plan complete" to "Implemented" (or similar), and remove the Recent Design Decisions section if it becomes stale.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately. T002, T003, T004 are `[P]` and can run alongside T001.
- **Phase 2 (Foundational)**: Depends on Phase 1. T005 must complete before T011 (shell depends on the state slice). T006/T007/T008/T009 are `[P]` service implementations that can run in parallel, but T011–T016 depend on them via DI wiring. T017–T019 (service unit tests) can run in parallel with each other and with T011–T016.
- **Phases 3–12 (User Stories)**: All depend on Phase 2 completion. Within the Foundational checkpoint, the Edit panel (US1) is unblocked as soon as T015 and T024 are ready; the remaining stories unblock fully after Phase 2 finishes.
- **Phase 13 (Polish)**: T076–T078 can start any time after their dependencies (all 10 stories done for T078/T079; earlier stories for T076/T077). T080 (route swap) must not happen until T079 (quickstart validation) passes. T081/T082 follow T080.

### User Story Dependencies

- **US1 (P1, MVP)**: Only depends on Phase 2. Testable without the sidebar because Foundational opens the Edit panel by default (T015).
- **US2 (P2)**: Only depends on Phase 2. Does not depend on US1, but visually richer once US1's Edit panel is in place.
- **US3 (P3)**: Depends on US2 (the Add Text icon in the sidebar). Can stub-test by dispatching `SetActiveTool('add-text')` directly before US2 is ready.
- **US4 (P4)**: Depends on Phase 2's `CanvasProviderService.selection$`. Independent of US2.
- **US5 (P5)**: Depends on Phase 2's `ImageUploadService` and US2 (sidebar icon). Can stub-test before US2.
- **US6 (P6)**: Same dependencies as US5.
- **US7 (P7)**: Depends on Phase 2 and US2. Reuses existing `ArtDocsService.getImagesByCategotiries()` feed — no new data fetch needed.
- **US8 (P8)**: Depends on Phase 2's `IconifyAdapterService` and US2.
- **US9 (P9)**: Depends on Phase 2 and US2. Consumes `canvas.getObjects()` directly.
- **US10 (P10)**: Depends on Phase 2's `CanvasHistoryService` (for undo/redo buttons) and `ArtFacadeService` (for save status).

### Within Each User Story

- Models/types (`edit-panel.types.ts`) before components that consume them.
- Panel component class + template together, before the registration step that wires them into the shell.
- Core behavior before history/a11y instrumentation within the same panel.

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 in parallel.
- **Phase 2**: T006, T007, T008, T009 (service impls) in parallel; T017, T018, T019 (service tests) in parallel; the component scaffolding (T011–T016) sequentially on top.
- **Across user stories**: Once Phase 2 finishes, any subset of US1–US10 can be worked in parallel by different developers since each story has a distinct panel or shell component and they all integrate through the same NGXS state and `CanvasProviderService` hooks.
- **Polish**: T076, T077, T078 in parallel; T079 → T080 → T081 → T082 sequential.

---

## Parallel Example: Phase 2 Foundational

```bash
# Services can all be built in parallel (different files, no runtime coupling yet):
Task: "T006 Implement CanvasHistoryService in src/app/modules/author/services/canvas-history.service.ts"
Task: "T007 Implement ImageUploadService in src/app/modules/author/services/image-upload.service.ts"
Task: "T008 Implement IconifyAdapterService in src/app/modules/author/services/iconify-adapter.service.ts"
Task: "T009 Implement FloatingToolbarController in src/app/modules/author/services/floating-toolbar.controller.ts"

# Their unit tests can also run in parallel:
Task: "T017 Unit tests for CanvasHistoryService"
Task: "T018 Unit tests for ImageUploadService"
Task: "T019 Unit tests for IconifyAdapterService"
```

## Parallel Example: User Stories after Foundational

```bash
# Three developers can pick up three independent panels after Phase 2:
Developer A: Phase 3 (US1 — Edit panel, MVP)
Developer B: Phase 6 (US4 — Floating toolbar)
Developer C: Phase 7 (US5 — Add Image upload)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 — Setup (T001–T004)
2. Phase 2 — Foundational (T005–T019): **critical path**; enables everything downstream.
3. Phase 3 — US1: Edit panel (T020–T025).
4. **STOP and VALIDATE**: Run the US1 smoke test in `quickstart.md` §1 against `/author/v2/:id`. Confirm the Edit panel opens by default, generates fields from existing text objects, and Apply Changes updates the canvas.
5. Demo or ship as internal preview at the parallel route.

### Incremental Delivery

1. MVP (US1) → ship at `/author/v2/:id`
2. Add US2 (sidebar) → all panels become reachable, even as placeholders
3. Add US4 (floating toolbar) → editing experience becomes visibly superior to legacy
4. Add US3, US5, US6 → feature parity with legacy for creation flows
5. Add US7, US8, US9 → creative depth (elements, icons, layer management)
6. Add US10 (topbar) → final visual polish
7. Phase 13 polish + route swap → legacy retired

### Parallel Team Strategy

With 3 developers after Foundational:

1. Dev A: US1 → US3 → US6 (creation + background)
2. Dev B: US2 → US4 → US10 (navigation + toolbar + topbar)
3. Dev C: US5 → US7 → US8 → US9 (assets + layers)
4. Converge on Phase 13 polish together; one owner for the route swap (T080).

---

## Task Summary

- **Total tasks**: 82
- **Setup**: 4 (T001–T004)
- **Foundational**: 15 (T005–T019)
- **US1 (P1, MVP)**: 6 (T020–T025)
- **US2 (P2)**: 6 (T026–T031)
- **US3 (P3)**: 4 (T032–T035)
- **US4 (P4)**: 8 (T036–T043)
- **US5 (P5)**: 6 (T044–T049)
- **US6 (P6)**: 5 (T050–T054)
- **US7 (P7)**: 4 (T055–T058)
- **US8 (P8)**: 5 (T059–T063)
- **US9 (P9)**: 7 (T064–T070)
- **US10 (P10)**: 5 (T071–T075)
- **Polish**: 7 (T076–T082)

**Parallel opportunities**: 3 Setup tasks, 7 Foundational tasks, and up to 10 user stories can run in parallel once Foundational lands. Within Polish, 3 tasks are parallelizable before the sequential route-swap block.

**MVP scope**: Phases 1–3 (Setup + Foundational + US1). Exit criteria: a live `/author/v2/:id` where the Edit panel opens by default on template load and successfully edits `IText` / `Textbox` objects.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks
- `[Story]` label (US1..US10) maps each user-story task back to a spec.md priority
- Each user story is independently demoable at `/author/v2/:id` — dispatch `SetActiveTool` from devtools if the sidebar (US2) is not yet built
- Commit after each task or logical group; keep the legacy `/author/:id` route functional until T080
- Auto-save is preserved from the existing `ArtFacadeService` — do not rewrite it
- History replay must be guarded with `isReplaying` to prevent snapshot loops (contracts/canvas-history.md)
- Floating toolbar reuses existing property-editor components via `*ngComponentOutlet` — do not reimplement font/color pickers

