# Research: Editor Phase 1 — Desktop Redesign

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12
**Scope**: Resolve technical approach for the 5 clarifications recorded in `spec.md` and validate integration patterns with the existing Angular/Fabric.js/NGXS/Supabase stack (baseline documented in `specs/001-editor-current-state/research.md`).

---

## 1. Undo/Redo history stack (FR-020, Clarification Q1)

### Decision: Serialized-snapshot history via Fabric.js `toObject()` + LRU-bounded ring buffer

Every undoable action pushes a compact snapshot of canvas state to a history service. Undo/redo replays a snapshot via `canvas.loadFromJSON()`.

- **What a snapshot contains**: `canvas.toObject(['id', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'visible', 'selectable'])` — Fabric.js's default property set plus the subset of custom keys we need to preserve visibility and lock state.
- **When snapshots are pushed**: `object:added`, `object:removed`, `object:modified`, `text:changed`, plus explicit pushes from the Layers panel (visibility/lock toggles) and the floating toolbar (style changes committed on mouse-up or blur, not on every intermediate value).
- **LRU bound**: 100 entries. When exceeded, the oldest entry is dropped.
- **Redo**: cleared whenever a new action is pushed after an undo.

### Rationale

- Fabric.js does not ship with undo/redo. The two community patterns are (a) per-property command objects and (b) full JSON snapshots. Snapshots are simpler, cover every property without per-type handlers, and match the "full coverage" clarification answer.
- `toObject()`/`loadFromJSON()` is the same serialization the existing auto-save uses (`canvasContent` in `IArtPage`), so it's already battle-tested in this codebase.
- Memory: a typical canvas with 30 objects serializes to ~15–50KB. 100 entries × 50KB = ~5MB, well within budget.
- Debouncing style changes to mouse-up/blur avoids flooding the stack during slider drags.

### Alternatives considered

- **Per-property command stack**: Lower memory, finer-grained, but requires writing and maintaining a command class per undoable action (~20 classes). Higher surface area for bugs. Rejected.
- **Immutable state tree via NGXS**: NGXS doesn't track Fabric.js internals; would require mirroring canvas state into the store, which duplicates the canvas. Rejected.
- **Fabric.js plugin `fabric-history`**: Unmaintained; targets Fabric v4/v5, not v6. Rejected.

---

## 2. User image upload and persistence (FR-023, Clarification Q2)

### Decision: Dedicated Supabase Storage bucket `user-uploads`, public read, per-user folder prefix

User-uploaded images go straight to Supabase Storage. The returned public URL is set as `FabricImage.src` so the saved design references the URL, not a base64 blob.

- **Bucket**: `user-uploads` (new). Created with public-read access so `fabric.Image.fromURL()` can load the asset without signed URLs.
- **Path convention**: `{userId}/{timestamp}-{nanoid}.{ext}` — user-scoped prefix prevents collisions and supports future per-user gallery queries.
- **Upload flow**:
  1. File picked → client-side validation (MIME type + size + dimensions, per FR-023a..FR-023c).
  2. `ImageUploadService.upload(file)` → `supabase.storage.from('user-uploads').upload(path, file)`.
  3. `getPublicUrl(path)` → URL stored in the new `UploadedImageRef` entity.
  4. `fabric.Image.fromURL(url)` → place on canvas.
- **Session gallery**: `ImageUploadService.listUserUploads(userId)` calls `supabase.storage.from('user-uploads').list(userId)` — returns metadata; URLs are resolved lazily.

### Rationale

- Matches the clarification answer ("persistent, URL-based") exactly.
- Keeps `canvasContent` JSON small. Base64-embedded images bloat `IArtPage.canvasContent` to megabytes and slow every save.
- Follows Supabase's standard security model; public bucket is acceptable for decorative user content (not sensitive).
- Per-user prefix makes gallery listing a single cheap call, and enables future retention/cleanup policies.

### Alternatives considered

- **Reuse the existing `thubnails` bucket** (used by `ArtDocsService.uploadFile()` for generated preview PNGs): conflates distinct content types; harder to apply different retention rules later. Rejected.
- **Signed URLs instead of public**: adds refresh complexity when a design is reopened days later; the signed URL may have expired. Rejected for Phase 1.
- **Hybrid with instant base64 preview** (Option C in clarification Q2): not selected by user.

### Open questions (deferred to tasks)

- Bucket creation SQL/dashboard action — scripted in `supabase/` folder or manual? Decision deferred.
- Service-worker caching of gallery URLs — desirable but not in scope for P5.

---

## 3. WCAG 2.1 AA accessibility (FR-040..FR-043, Clarification Q3)

### Decision: Lean on Angular CDK a11y primitives + ng-zorro-antd ARIA support; custom work for the floating toolbar

Most of the editor chrome will use ng-zorro-antd components (buttons, dropdowns, tooltips, input, color pickers) which already ship with ARIA roles. The gaps to fill:

1. **Keyboard focus trap inside the contextual panel** — use `@angular/cdk/a11y` `FocusTrap` / `cdkTrapFocus` directive while a panel is open.
2. **Roving tabindex on the left sidebar** — use `cdkMonitorSubtreeFocus` + a `FocusKeyManager` so arrow keys move between the 7 tool icons.
3. **Floating toolbar** — build on `@angular/cdk/overlay` which provides accessible `ConnectedPositionStrategy`. Apply `role="toolbar"` and a `FocusKeyManager` for arrow-key navigation between buttons.
4. **Live region announcements** — a single `<div aria-live="polite">` hosted by `EditorShellComponent` receives text like "Edit panel opened", "Text object selected", "Saving…", "Saved".
5. **Visible focus indicators** — global CSS `*:focus-visible { outline: 2px solid #00b4d8 }` (matching existing brand color used for Fabric.js selection borders) on top of ng-zorro defaults.
6. **Color contrast** — verified with axe-core or similar during implementation; any ng-zorro tokens failing 4.5:1 get overridden in `styles.scss`.
7. **Canvas a11y** — the Fabric.js canvas itself is exempt from visual-content contrast rules but gets `role="img"` with a dynamic `aria-label` describing the current selection; keyboard users operate via the panels and floating toolbar, not direct canvas manipulation in Phase 1.

### Rationale

- CDK a11y is already a transitive dependency via Angular Material patterns used elsewhere; no new packages needed.
- ng-zorro-antd has committed ARIA support (documented in their a11y guide); relying on it is cheaper than hand-rolling.
- Canvas drag-to-reposition is not keyboard-accessible in Phase 1 by design — the Layers panel + floating toolbar provide equivalent functionality.

### Alternatives considered

- **WCAG 2.1 AAA**: rejected in clarification (stricter contrast, hard to meet).
- **Custom a11y wrapper per panel**: too much duplication; use CDK primitives instead.

---

## 4. Iconify integration (FR-031..FR-033a, Clarification Q4)

### Decision: Direct `fetch()` against `api.iconify.design` from an `IconifyAdapterService`; session cache via `Map`

No Iconify SDK. The HTTP API is small enough to call directly.

- **Search endpoint**: `GET https://api.iconify.design/search?query={q}&limit=60` → returns `{ icons: ['mdi:heart', 'bi:heart-fill', ...] }`.
- **SVG fetch**: `GET https://api.iconify.design/{prefix}/{name}.svg?color={color}` → returns raw SVG text.
- **Placement on canvas**: parse SVG string via Fabric.js `loadSVGFromString()` → create `Group` → `canvas.add()`.
- **Cache**: `Map<string, IconifyEntry>` keyed by `prefix:name`. Also a `Map<string, string[]>` for search query → icon IDs. Both cleared on page reload (session-scoped, per clarification).
- **Error handling**: network failure → user-friendly error in panel; no retries (user can re-search).

### Rationale

- Iconify's HTTP API is stable and documented; no auth, no rate limit at the tag-designer volumes expected.
- Avoiding the Iconify npm SDK keeps the bundle small and avoids Angular zone.js friction with their Web Component.
- Fabric.js `loadSVGFromString()` is the canonical way to convert SVG strings into manipulable canvas objects with applied fill/stroke.

### Alternatives considered

- **`@iconify/vue` or `@iconify/react`**: wrong framework.
- **`@iconify-json/*` static packs** pre-bundled: bloats bundle; defeats the "instant access to 200K icons" value prop. Rejected.
- **Self-hosted Iconify server**: unnecessary complexity for Phase 1.

---

## 5. Image upload constraints (FR-023a..FR-023c, Clarification Q5)

### Decision: Client-side validation pipeline before any network call

`ImageUploadService.validate(file)` runs three checks synchronously and returns a `ValidationResult`:

| Check | Rule | Failure |
|---|---|---|
| MIME type | `file.type` ∈ `{image/jpeg, image/png, image/webp, image/svg+xml}` | Reject with "Only JPEG, PNG, WebP, or SVG are supported." |
| File size | `file.size ≤ 10 * 1024 * 1024` | Reject with "Image must be 10MB or smaller." |
| Dimensions | Read via `createImageBitmap(file)` or `<img>` `onload`; check `width/height ≤ 4000` | **Warn only**, still upload |

Only files passing MIME + size proceed to upload. Dimension warning is non-blocking — the user can choose to continue.

### Rationale

- Catching bad files before the network call saves bandwidth and latency.
- `createImageBitmap` is supported in all target browsers and avoids needing a full `<img>` element for dimension checks. SVG falls back to parsing the `viewBox`.
- Non-blocking dimension warning matches clarification answer ("warn, not reject") and preserves user autonomy.

### Alternatives considered

- **Server-side validation only**: possible via Supabase Storage policies, but returns errors after the upload has already wasted bytes. Rejected.
- **Auto-downscale** (Option D in clarification): not selected by user; adds image-processing code not needed in Phase 1.

---

## 6. Angular CDK drag-drop for the Layers panel (FR-035)

### Decision: `@angular/cdk/drag-drop` with `cdkDropList` + `cdkDrag` directives

- `cdkDropListDropped` fires with `previousIndex` and `currentIndex`.
- Handler calls `canvas.moveObjectTo(object, newIndex)` (Fabric.js v6 API).
- Layer order in the panel is reverse of `canvas.getObjects()` (topmost first), so indices must be inverted before the `moveObjectTo` call.
- NGXS layer state is recomputed from `canvas.getObjects()` after each drop, not maintained separately.

### Rationale

- CDK drag-drop is already a likely transitive dependency (shared with a11y) and requires zero third-party code.
- Single source of truth = `canvas.getObjects()`; no state sync bugs between a side-store and the canvas.

### Alternatives considered

- **`ng-sortable` / `sortablejs`**: extra dependency, no upside over CDK. Rejected.

---

## 7. Floating toolbar positioning (FR-013..FR-017)

### Decision: `@angular/cdk/overlay` with `FlexibleConnectedPositionStrategy`

- Attach overlay to the canvas element using a `CdkOverlayOrigin` positioned at the selected object's bounding box (computed via `object.getBoundingRect()` on each `selection:created`/`selection:updated`/`object:moving`).
- Preferred position: above the object, center-aligned. Fallback: below. Fallback: inside near the top.
- Overlay auto-detects viewport overflow and flips (satisfies FR-016 and the "near top of canvas" edge case).
- Toolbar content is a standalone `FloatingToolbarComponent` whose template branches on `selectedObjectType` (text/image/shape) to render the right control set.

### Rationale

- Angular CDK overlay is the standard way to build non-modal floating UI in Angular; handles scroll, resize, viewport, and z-index.
- Recomputing `getBoundingRect()` on move events keeps the toolbar tracking the object during drag — already a well-understood Fabric.js pattern.

### Alternatives considered

- **Absolute-positioned div inside the canvas container**: reinvents overlay positioning logic; harder to keep viewport-aware. Rejected.

---

## 8. Reuse of existing editor sub-components

### Decision: The existing property editors under `src/app/modules/author/components/text-editor/`, `color-editor/`, `box-shadow-editor/`, `opacity-editor/`, `superposition-editor/` are **reusable** inside the new floating toolbar

Per the 001 audit, these components subscribe to `CanvasUtilsService.editorEvent$` and operate on the active canvas object via property names. They are UI-only and do not depend on the legacy bottom-drawer shell. They can be instantiated inside the new `FloatingToolbarComponent` dynamically (same `*ngComponentOutlet` pattern used today) without modification.

### Rationale

- Zero-cost reuse of already-working code.
- Avoids re-implementing color pickers and font pickers in Phase 1.
- The floating toolbar acts as the new host; the old drawer host is retired.

---

## 9. Supabase Storage bucket creation strategy

### Decision: Document the required bucket + policy in `contracts/image-upload.md`; leave the actual `CREATE BUCKET` call to an implementation task

- Bucket name: `user-uploads`
- Public: yes (read)
- Policy: authenticated users can INSERT objects under their own `{userId}/` prefix; anonymous users cannot upload; anyone can SELECT.
- Cleanup/retention: not defined in Phase 1.

This isolates the infrastructure concern from the client-side planning scope. The task phase will decide whether to manage the bucket via SQL migration or Supabase dashboard.

---

## Summary of resolved items

| Clarification / Unknown | Decision | Location |
|---|---|---|
| Q1: Undo/redo scope | JSON-snapshot ring buffer, LRU 100 | §1 |
| Q2: Image persistence | Supabase Storage, per-user prefix, public read | §2 |
| Q3: Accessibility baseline | WCAG 2.1 AA via CDK a11y + ng-zorro + custom overlay work | §3 |
| Q4: Icon library | Iconify HTTP API + Map-based session cache | §4 |
| Q5: Image constraints | Client validation before upload; soft dimension warning | §5 |
| Layer drag-drop library | `@angular/cdk/drag-drop` | §6 |
| Floating toolbar positioning | `@angular/cdk/overlay` FlexibleConnectedPositionStrategy | §7 |
| Reuse of legacy property editors | Yes, hosted inside `FloatingToolbarComponent` | §8 |
| Supabase bucket setup | Documented, task-phase deliverable | §9 |

**No NEEDS CLARIFICATION items remain in Technical Context.**
