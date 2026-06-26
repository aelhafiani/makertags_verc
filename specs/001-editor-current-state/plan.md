# Implementation Plan: Editor Current State — Existing Functionality Audit

**Branch**: `001-editor-current-state` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-editor-current-state/spec.md`

---

## Summary

This branch is a **read-only audit** of the existing Angular 19.2/Fabric.js 6.6.1 editor. There is no new code to write. The deliverable is a complete, accurate documentation of current editor behavior — spec, research, data model, and contracts — to serve as the verified baseline for Phase 1 redesign (`002-editor-phase1-desktop`).

Technical approach: direct codebase inspection of `AuthorLayoutComponent` and all supporting services and sub-components. All NEEDS CLARIFICATION items were resolved by reading source files. Findings are recorded in `research.md`.

---

## Technical Context

**Language/Version**: TypeScript — Angular 19.2.x (standalone components, Angular SSR enabled)  
**Primary Dependencies**: Fabric.js 6.6.1, NGXS 20.1, ng-zorro-antd 17.2, Bootstrap 5.3.2, Supabase JS 2.53, RxJS 7.8  
**Storage**: Supabase (PostgreSQL via `supabase-js`); Supabase Storage for preview images  
**Testing**: Karma/Jasmine (`ng test`) — spec files co-located with components  
**Target Platform**: Web browser (PWA via `@angular/service-worker`; SSR via `@angular/ssr`)  
**Project Type**: Web application (Angular SPA)  
**Performance Goals**: Not defined in audit scope. Canvas zoom is computed as `Math.min(containerWidth/width, containerHeight/height)` to fit the artDoc dimensions responsively.  
**Constraints**: Audit only — no changes to production code. All findings must be verifiable by reading existing source files.  
**Scale/Scope**: Single-page editor with ~50 Angular components. Up to 2 canvas faces per art document. Up to N Fabric.js objects per face (no documented limit).

---

## Constitution Check

The project constitution (`/.specify/memory/constitution.md`) contains only template placeholders — no project-specific principles have been ratified. No gates to evaluate.

**Post-design re-check**: N/A — audit produces documentation only, no architectural decisions.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-editor-current-state/
├── plan.md              ← This file
├── research.md          ← Phase 0: codebase audit findings + corrections to spec
├── data-model.md        ← Phase 1: IArtDoc, IArtPage, Fabric.js object types
├── quickstart.md        ← Phase 1: how to run the editor locally
├── contracts/
│   ├── supabase-api.md  ← Phase 1: Supabase CRUD contracts (save art, load, upload preview)
│   └── canvas-event-bus.md ← Phase 1: CanvasUtilsService event bus interface
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (existing — not modified by this branch)

```text
src/app/modules/author/
├── components/
│   ├── author/                        # Root editor (AuthorLayoutComponent)
│   │   ├── author.component.ts        # Canvas lifecycle, Fabric.js events, save, tabs
│   │   ├── author.component.html      # Topbar, canvas area, bottom tab bar, drawers
│   │   └── canvasPdf.service.ts       # PDF export
│   ├── pages-selector/                # Front/back face switcher (right-side drawer)
│   ├── add-text/                      # Text tab component
│   ├── add-elements/                  # Elements tab: category-grouped asset picker
│   ├── add-marque/                    # Marque tab: EMPTY STUB — no implementation
│   ├── add-import/                    # Import tab: EMPTY STUB — handled in author.component.ts
│   ├── text-editor/
│   │   ├── font-family-editor/        # Contextual: font family picker
│   │   ├── text-editor-size/          # Contextual: font size
│   │   ├── color-editor-text/         # Contextual: text color
│   │   ├── text-align-editor/         # Contextual: alignment & format
│   │   ├── text-spacing-editor/       # Contextual: letter spacing
│   │   └── text-style/                # Contextual: bold/italic/underline
│   ├── color-editor/                  # Contextual (canvas bg): background color
│   ├── images-editor/                 # Contextual (image): image property editor
│   ├── svg-color-editor/              # Contextual (SVG): SVG fill color
│   ├── superposition-editor/          # Contextual: z-index / position
│   ├── opacity-editor/                # Contextual: opacity (0–1)
│   ├── box-shadow-editor/             # Contextual: drop shadow
│   ├── layering-editor/               # Layer management — COMMENTED OUT in config
│   ├── share-options/                 # Share menu (drawer)
│   ├── share-public-link/             # Public share link
│   ├── download-options/              # Download: PDF, JPEG, PNG
│   └── element-icons-editor/          # Element icon editor
│
└── (shared services in src/app/modules/shared/)
    ├── services/
    │   ├── new-art.facade.ts          # NGXS facade for IArtDoc state
    │   ├── art-docs.service.ts        # Supabase CRUD
    │   ├── auth.service.ts            # Auth + isAdmin$ gate
    │   └── firebase-storage.service.ts # Legacy Firebase Storage (partially replaced by Supabase)
    ├── canvas/
    │   └── canvas.utils.service.ts   # Canvas event bus (BehaviorSubject channels)
    └── domaine/entities/
        └── art.ts                    # IArtDoc, IArtPage interfaces
```

**Structure Decision**: Existing Angular project (Option 2: web application). No new directories created by this audit branch.

---

## Complexity Tracking

No constitution violations. No complexity to justify.

---

## Key Corrections from Research Phase

The following findings from `research.md` update or correct earlier spec assumptions:

1. **Import tab is not a JSON importer** — it triggers an image file picker (`input[type=file]`, `accept="image/*"`). Clicking the Import tab calls `triggerFileInput()` in `AuthorLayoutComponent`. The imported image is added to the canvas as a `FabricImage`. The `AddImportComponent` itself is an empty stub.

2. **Marque tab has no implementation** — `AddMarqueComponent` is an empty Angular component (no template content, no methods). The bottom tab exists as a UI element but does nothing.

3. **Save Art is admin-only** — the button is rendered inside `*ngIf="isAdmin$ | async"`. Regular (non-admin) users have an auto-save path: `saveUserArt()` triggers automatically on canvas change events and saves only the current face.

4. **Face switcher is drawer-based** — `PagesSelectorComponent` lives inside a right-side `nzDrawer` (200px). The drawer is toggled by a `>>` button (`open-page-drawer` CSS class). It is not a tab, button, or toggle in the canvas chrome.

5. **Page selection uses a module-level BehaviorSubject** — `selectedPageIndexSubj` is exported from `pages-selector.component.ts` as a module global, bypassing Angular DI. This is a fragile coupling point for Phase 1.
