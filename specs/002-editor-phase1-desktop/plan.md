# Implementation Plan: Editor Phase 1 — Desktop Redesign

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-editor-phase1-desktop/spec.md`

---

## Summary

Replace the existing bottom-tab + dynamic-drawer editor shell (`AuthorLayoutComponent`, audited in `specs/001-editor-current-state/`) with a four-zone desktop layout: 72px left sidebar (7 tool icons), 260px contextual panel, flexible canvas area, and 140px mini-preview column. The primary new feature is the Edit panel, which auto-generates a form from the `IText`/`Textbox` objects already on the Fabric.js canvas. Six additional panels (Add Text, Add Image, Background, Elements, Icons, Layers) plus a floating contextual toolbar complete the interaction surface.

Technical approach (grounded in the spec's 5 clarifications):
- **Undo/redo** — build a `CanvasHistoryService` on top of Fabric.js `toJSON()`/`loadFromJSON()` with a full-coverage history stack (create/delete, text content, transform, style, visibility/lock).
- **User image upload** — persist to a dedicated Supabase Storage bucket; save the returned URL on `FabricImage.src`, not base64.
- **Accessibility** — WCAG 2.1 AA across all chrome (sidebar, panels, floating toolbar, topbar); canvas drawing surface exempt from contrast rules but all interactive controls ARIA-labeled with visible focus.
- **Icons** — `IconifyAdapterService` wrapping `api.iconify.design` (search + SVG fetch) with in-memory session cache.
- **Image validation** — JPEG/PNG/WebP/SVG ≤10MB; soft warning above 4000×4000.

The Fabric.js canvas, `IArtDoc` state, `ArtFacadeService`, auto-save pipeline, and `PagesSelectorComponent` (mini-preview) are preserved from the current implementation. All other editor chrome is rebuilt.

---

## Technical Context

**Language/Version**: TypeScript — Angular 19.2.x (standalone components, Angular SSR enabled)
**Primary Dependencies**: Fabric.js 6.6.1, NGXS 20.1, ng-zorro-antd 17.2, Bootstrap 5.3.2, Supabase JS 2.53, RxJS 7.8, Angular CDK (drag-drop, a11y, overlay)
**Storage**: Supabase PostgreSQL (via `supabase-js`) for `art_docs` + user data; Supabase Storage for user-uploaded images (new bucket) and existing preview thumbnails.
**Testing**: Karma/Jasmine (`ng test`) — component specs co-located; new services get unit tests; new panels get shallow integration tests driving a real `fabric.Canvas` in memory.
**Target Platform**: Modern desktop web browsers at ≥1024px viewport width. Mobile/tablet deferred to Phase 2.
**Project Type**: Web application (Angular SPA, existing).
**Performance Goals**:
- Panel switch (including animation): <400ms (SC-002)
- Floating toolbar appears after selection: <200ms (SC-006)
- Edit-panel form generation on template load: <150ms for canvases with ≤50 text objects
- Undo/redo step replay: <100ms for canvases with ≤200 objects
**Constraints**:
- WCAG 2.1 AA compliance for all editor chrome (FR-040..FR-043)
- Canvas must remain visible during every panel interaction (SC-003)
- No horizontal scrolling at ≥1024px (SC-009)
- User images: JPEG/PNG/WebP/SVG only, ≤10MB, soft warning >4000×4000 (FR-023a..FR-023c)
- No regression to existing auto-save or face-switching behavior (documented in 001)
**Scale/Scope**:
- One editor shell, 7 contextual panels, 1 floating toolbar, 1 topbar, 1 mini-preview column
- Canvas supports up to 2 faces (front/back) per art document — inherited from `IArtDoc.pages`
- Expected typical canvas object count: 5–50 per face; history stack sized for 100 entries (LRU)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) contains only unfilled template placeholders — no project-specific principles have been ratified. **No gates to evaluate.**

**Initial check (pre-Phase 0)**: PASS (no principles defined).
**Post-design re-check (after Phase 1)**: PASS — no new architectural patterns introduced that would require constitutional justification; all new services follow the existing Angular standalone + NGXS facade conventions.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-editor-phase1-desktop/
├── plan.md              ← This file (/speckit.plan output)
├── research.md          ← Phase 0: technical research on clarification decisions
├── data-model.md        ← Phase 1: new entities (HistoryEntry, UploadedImageRef, etc.)
├── quickstart.md        ← Phase 1: how to run and exercise the redesigned editor
├── contracts/
│   ├── editor-shell.md         ← Sidebar + panel orchestration contract
│   ├── canvas-history.md       ← Undo/redo service contract (FR-020)
│   ├── image-upload.md         ← Supabase Storage upload contract (FR-023)
│   └── iconify-adapter.md      ← Iconify API adapter contract (FR-031)
├── checklists/          ← (existing)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (new + modified directories)

```text
src/app/modules/author/
├── components/
│   ├── shell/                             # NEW — Phase 1 editor shell root
│   │   ├── editor-shell.component.ts      # Replaces AuthorLayoutComponent as route target
│   │   ├── editor-shell.component.html    # Four-zone layout scaffold
│   │   ├── left-sidebar/                  # 7 tool icons, active-state, keyboard nav
│   │   ├── contextual-panel/              # Panel host + slide animation
│   │   ├── floating-toolbar/              # Selection-driven overlay (Angular CDK Overlay)
│   │   ├── topbar/                        # Save/Exit, title, undo/redo, Preview, Next
│   │   └── mini-preview-column/           # Wraps existing PagesSelectorComponent
│   │
│   ├── panels/                            # NEW — one component per tool
│   │   ├── edit-panel/                    # Auto-form from IText/Textbox (FR-007..FR-012)
│   │   ├── add-text-panel/                # Quick-style presets + text entry
│   │   ├── add-image-panel/               # Upload + session gallery
│   │   ├── background-panel/              # Color + image background
│   │   ├── elements-panel/                # Shapes + graphics grid
│   │   ├── icons-panel/                   # Iconify search grid
│   │   └── layers-panel/                  # CDK drag-drop layer list
│   │
│   └── author/                            # EXISTING — kept but no longer the route target;
│                                           # sub-editors (font, color, etc.) may still be
│                                           # reused inside the floating toolbar.
│
└── services/                              # NEW — editor shell services
    ├── editor-shell.state.ts              # NGXS sub-state: activeTool, panelOpen, selection
    ├── canvas-history.service.ts          # Undo/redo stack (FR-020)
    ├── image-upload.service.ts            # Supabase Storage upload wrapper (FR-023)
    ├── iconify-adapter.service.ts         # Iconify API + session cache (FR-031..FR-033a)
    └── floating-toolbar.controller.ts     # Position + content resolution per Fabric type

src/app/modules/shared/
├── canvas/
│   └── canvas.utils.service.ts            # EXISTING — reused; may gain history hooks
├── services/
│   ├── art-docs.service.ts                # EXISTING — uploadFile() may be extended
│   └── new-art.facade.ts                  # EXISTING — reused for IArtDoc state

src/assets/icons/                          # EXISTING bundled icons; unchanged
```

**Structure Decision**: Existing Angular SPA (web application). Two new top-level folders under `src/app/modules/author/components/` — `shell/` and `panels/` — isolate all new redesign code from the current `AuthorLayoutComponent` tree. This lets the legacy editor continue to function until the route is switched (which is a tasks.md concern, not a plan.md concern). New services live under `src/app/modules/author/services/` so they can be deleted cleanly if the redesign is rolled back.

---

## Complexity Tracking

No constitution violations (constitution is unpopulated). No complexity to justify.

---

## Risks & Deferred Decisions

The following items are acknowledged but do not block task decomposition — they are better resolved during implementation (`/speckit.tasks` and subsequent execution):

1. **History stack memory bound** — 100-entry LRU is a starting budget; may need tuning once real-world `canvas.toJSON()` sizes are measured.
2. **Auto-save + undo interaction** — when the user undoes past the last auto-save checkpoint, the saved server state diverges from the canvas. Mitigation strategy (checkpoint on each undoable step vs. debounced save) will be confirmed against the existing `saveUserArt()` debounce during implementation.
3. **Observability** — no logging/metrics signals defined for panel switches, upload failures, or Iconify API failures. Decision deferred; the existing `NotificationPushService` is available if surface-level error reporting is needed.
4. **Scalability ceiling** — no explicit object-count limit documented. Phase 1 assumes 5–50 typical, 200 ceiling for performance targets.
