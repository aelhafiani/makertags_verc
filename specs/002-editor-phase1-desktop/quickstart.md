# Quickstart: Editor Phase 1 — Desktop Redesign

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12

---

## Prerequisites

- Node.js (LTS — no `.nvmrc`; project uses Angular 19 tooling)
- Yarn (lockfile is `yarn.lock`)
- A Supabase project with:
  - The existing `art_docs` / `art_docs_faces` tables (already in use)
  - A new `user-uploads` storage bucket (public read, authenticated write — see `contracts/image-upload.md` for policies)
- A valid `src/environments/environment.ts` with Supabase URL + anon key (same file used by the existing editor)

---

## Install

```bash
yarn install
```

No new npm packages are introduced in Phase 1. `@angular/cdk` (drag-drop, a11y, overlay) is expected to be resolvable via the existing ng-zorro-antd dependency tree; if not, add it as a direct dependency during implementation.

---

## Run

```bash
yarn start
# or
ng serve
```

Dev server: `http://localhost:4200`

---

## Access the redesigned editor

During implementation the new shell will live at the same author route as today:

```
http://localhost:4200/author/{artDocId}
```

Until the route swap is performed (task-phase decision), the new `EditorShellComponent` may be reachable via a parallel route such as `/author/v2/{id}` for side-by-side comparison. The tasks phase will confirm the rollout strategy.

---

## Smoke tests (manual walkthroughs)

These map 1:1 to the spec's acceptance scenarios. Run them against a template that contains at least 3 IText/Textbox objects and one decorative image.

### 1. Personalize text (User Story 1)

1. Open a template — Edit panel opens by default (FR-006).
2. Verify every `i-text` / `textbox` object on the canvas appears as a labeled input in the Edit panel (FR-007, SC-004).
3. Type a new value in one field → click **Apply changes** → verify the canvas text updates (FR-011, SC-005).
4. Expected: no page refresh, instant canvas re-render.

### 2. Sidebar navigation (User Story 2)

1. Click **Add Text** in the left sidebar → Edit panel closes, Text panel opens (FR-003).
2. Click **Add Text** again → panel closes (FR-003 toggle).
3. Verify only one panel is ever visible at a time.
4. Measure: panel switch under 400ms (SC-002).

### 3. Add free text (User Story 3)

1. Open the Text panel → click a quick-style preset → a new IText object appears on the canvas.
2. Open the Edit panel → the new object appears in the list.

### 4. Floating toolbar (User Story 4)

1. Click a text object on the canvas → toolbar appears above it within 200ms (SC-006, FR-013).
2. Change font size → canvas updates in real time (FR-017).
3. Scroll or drag the object near the top edge → toolbar repositions below (FR-016).
4. Click empty canvas → toolbar disappears (FR-015).

### 5. Upload image (User Story 5) — **Supabase-dependent**

1. Open the Add Image panel → click **Upload from computer** → pick a JPEG < 10MB.
2. Image appears on the canvas as a Fabric.js Image object whose `src` is a `https://*.supabase.co/storage/...` URL (research §2).
3. Close and reopen the panel → the uploaded image appears in the gallery (FR-024).
4. Reload the page → the gallery still shows the image (persistence check, clarification Q2).

Invalid-input checks:
- Pick a `.txt` file → rejected with MIME error (FR-023a).
- Pick an image > 10MB → rejected with size error (FR-023b).
- Pick a 6000×6000 image → accepted with a dimension warning (FR-023c).

### 6. Background panel (User Story 6)

1. Open Background panel → click a color swatch → canvas background updates (FR-025).
2. Enter `#ff5500` in the custom hex input → canvas background updates.
3. Click **Remove** → background reverts.

### 7. Elements panel (User Story 7)

1. Open Elements panel → click a circle → `Circle` appears centered on canvas.
2. Type a keyword in the search bar → grid filters (FR-030).

### 8. Icons panel (User Story 8) — **Iconify-dependent**

1. Open Icons panel → search "heart" → grid populates (FR-031).
2. Pick a color → click an icon → icon is placed on the canvas as a Fabric.js Group with the chosen fill (FR-032).
3. Search "heart" again → grid loads from cache (no network call, research §4).

### 9. Layers panel (User Story 9)

1. Open Layers panel → verify the list matches `canvas.getObjects()` reversed.
2. Drag a layer to a new position → order updates on the canvas (FR-035).
3. Toggle visibility → object disappears on canvas (FR-036).
4. Toggle lock → cannot drag the object on the canvas (FR-037).

### 10. Topbar & undo (User Story 10)

1. Make a change → topbar shows "Saving…" → "Saved" (FR-019).
2. Click **Undo** → last change reverses (FR-020, SC-010).
3. Redo works through the full set of undo action types (research §1 — object create/delete, text edits, transforms, style, visibility, lock).

### 11. Keyboard & a11y

1. Tab through the sidebar → all 7 tool icons receive focus with a visible outline.
2. Arrow keys move between sidebar icons (roving tabindex).
3. Open a panel, press `Escape` → panel closes.
4. Screen reader (NVDA / VoiceOver) announces "Edit panel opened", "Text object selected", "Saved" (FR-042).
5. Run axe-core or similar on each panel → no 4.5:1 contrast failures on chrome (FR-043).

---

## Tests

```bash
ng test
```

Runs Karma/Jasmine in watch mode. New unit tests to add during implementation:

- `canvas-history.service.spec.ts` — stack behavior, replay, LRU, face scoping
- `image-upload.service.spec.ts` — validation branches + mocked Supabase upload
- `iconify-adapter.service.spec.ts` — search cache + SVG fetch + error paths
- `edit-panel.component.spec.ts` — form generation from a real in-memory Fabric.js canvas
- `floating-toolbar.controller.spec.ts` — descriptor resolution by object type

---

## Build (production)

```bash
yarn build:prod
# or
ng build --configuration production
```

Output: `dist/makertags/`

---

## Key files for Phase 1 implementation

| File (new unless noted) | Purpose |
|---|---|
| `src/app/modules/author/components/shell/editor-shell.component.ts` | Root of the new editor; replaces `AuthorLayoutComponent` as route target |
| `src/app/modules/author/components/shell/left-sidebar/left-sidebar.component.ts` | 7 tool icons, roving tabindex |
| `src/app/modules/author/components/shell/contextual-panel/contextual-panel.component.ts` | Panel host + slide animation |
| `src/app/modules/author/components/shell/floating-toolbar/floating-toolbar.component.ts` | CDK overlay-based contextual toolbar |
| `src/app/modules/author/components/shell/topbar/topbar.component.ts` | Save/Exit, title, save status, undo/redo, Next |
| `src/app/modules/author/components/panels/edit-panel/edit-panel.component.ts` | Auto-form from IText/Textbox |
| `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` | Quick-style presets + text entry |
| `src/app/modules/author/components/panels/add-image-panel/add-image-panel.component.ts` | Upload + gallery |
| `src/app/modules/author/components/panels/background-panel/background-panel.component.ts` | Color + image background |
| `src/app/modules/author/components/panels/elements-panel/elements-panel.component.ts` | Shapes + graphics grid |
| `src/app/modules/author/components/panels/icons-panel/icons-panel.component.ts` | Iconify search grid |
| `src/app/modules/author/components/panels/layers-panel/layers-panel.component.ts` | CDK drag-drop layer list |
| `src/app/modules/author/services/canvas-history.service.ts` | Undo/redo history (contract: canvas-history.md) |
| `src/app/modules/author/services/image-upload.service.ts` | Supabase Storage upload (contract: image-upload.md) |
| `src/app/modules/author/services/iconify-adapter.service.ts` | Iconify API + session cache (contract: iconify-adapter.md) |
| `src/app/modules/author/services/floating-toolbar.controller.ts` | Per-type descriptor resolver |
| `src/app/modules/author/services/editor-shell.state.ts` | NGXS sub-state |
| `src/app/modules/shared/canvas/canvas.utils.service.ts` | **Existing** — reused for legacy property editors hosted inside the floating toolbar |
| `src/app/modules/shared/services/new-art.facade.ts` | **Existing** — reused for IArtDoc state and auto-save |
| `src/app/modules/author/components/pages-selector/pages-selector.component.ts` | **Existing** — wrapped by the new mini-preview column |
