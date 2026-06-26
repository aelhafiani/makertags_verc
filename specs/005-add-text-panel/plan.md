# Implementation Plan: Add Text Panel

**Branch**: `005-add-text-panel` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-add-text-panel/spec.md`

## Summary

Implement an `AddTextPanelComponent` that is mounted by the existing `ContextualPanelComponent` when the active tool is `'add-text'`. The panel lists all `i-text` / `textbox` objects from the active Fabric.js canvas as editable inputs, keeps them in sync bidirectionally with the canvas, and offers a single "Add a text box" button to create new text objects. The existing `EditPanelComponent` and `edit-panel.types.ts` are the direct architectural precedent; this feature follows the same patterns with additions for dynamic list updates and canvas selection sync.

## Technical Context

**Language/Version**: TypeScript 5.x — Angular 19.2 (standalone components, OnPush)  
**Primary Dependencies**: Fabric.js 6.6.1, RxJS 7.8, ng-zorro-antd 17.2, NGXS 20.1  
**Storage**: No persistent storage — canvas state only (in-memory Fabric.js canvas)  
**Testing**: Karma/Jasmine (`ng test`) — not in scope for this feature (no tests requested)  
**Target Platform**: Desktop web browser (editor viewport)  
**Project Type**: Single-page web application (Angular SPA)  
**Performance Goals**: Input→canvas update ≤ 100 ms; canvas→panel highlight ≤ 200 ms; no visible lag with up to 30 text objects  
**Constraints**: Panel must not use direct DOM manipulation; must use Angular CDK / OnPush + ChangeDetectorRef pattern consistent with `EditPanelComponent`  
**Scale/Scope**: Single panel component, ~150–200 LOC across 4 files

## Constitution Check

The constitution.md has not been customised for this project (still the blank template). No custom gates apply. Standard Angular/project conventions from CLAUDE.md govern:

- Standalone components with OnPush change detection ✅
- RxJS + `takeUntil(destroy$)` pattern ✅
- `CanvasProviderService` as the single source of truth for canvas access ✅
- No new global services required — all dependencies already exist ✅

## Project Structure

### Documentation (this feature)

```text
specs/005-add-text-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

This feature adds one new component and modifies one existing file:

```text
src/app/modules/author/
├── components/
│   ├── panels/
│   │   ├── edit-panel/                          # EXISTING — unchanged
│   │   │   ├── edit-panel.component.ts
│   │   │   ├── edit-panel.component.html
│   │   │   ├── edit-panel.component.scss
│   │   │   └── edit-panel.types.ts              # EXISTING — reused as-is
│   │   └── add-text-panel/                      # NEW
│   │       ├── add-text-panel.component.ts      # NEW
│   │       ├── add-text-panel.component.html    # NEW
│   │       └── add-text-panel.component.scss    # NEW
│   └── shell/
│       └── contextual-panel/
│           └── contextual-panel.component.ts    # MODIFIED — register 'add-text'
└── services/
    ├── canvas-provider.service.ts               # EXISTING — used (canvas$, activeObject$)
    ├── canvas-history.service.ts                # EXISTING — used (push history on blur)
    └── editor-shell.state.ts                    # EXISTING — 'add-text' ToolId already defined
```

**Structure Decision**: Single Angular project structure. All new files are inside the existing `panels/` directory, following the established one-folder-per-panel convention. No new directories at higher levels required.

## Phase 0: Research

### Decision 1 — Reuse `buildFieldsFromCanvas()` from `edit-panel.types.ts`

**Decision**: Reuse the existing `buildFieldsFromCanvas()` helper unchanged.  
**Rationale**: The function already extracts `i-text` and `textbox` objects, assigns stable `nanoid` IDs, and maps them to `EditablePanelField`. This is exactly what the Add Text panel needs. Duplicating it would create drift.  
**Alternatives considered**: Inline the extraction logic in the new component — rejected because it would duplicate code that is already well-tested by the existing edit panel.

### Decision 2 — Dynamic list via canvas event listeners, not a separate service

**Decision**: Subscribe to canvas `object:added` and `object:removed` events directly inside `AddTextPanelComponent.ngOnInit()`, calling `rebuildList()` on each event.  
**Rationale**: The list only needs to be fresh while this panel is mounted; the subscription is torn down on `ngOnDestroy()`. A separate service would be over-engineering for one panel.  
**Alternatives considered**: NGXS action for canvas changes — rejected because canvas events are imperative and Fabric.js does not emit them through Angular's change detection.

### Decision 3 — Canvas selection → panel highlight via `activeObject$`

**Decision**: Subscribe to `CanvasProviderService.activeObject$` and compare the active object's `id` against the current field list to set a `focusedObjectId` property.  
**Rationale**: `activeObject$` is already the declared reactive API for canvas selection and is updated by `CanvasProviderService.setSelection()`. Using it avoids wiring a second canvas event listener for `selection:changed`.  
**Alternatives considered**: Listen to `canvas.on('selection:changed')` directly — acceptable but redundant given the existing stream.

### Decision 4 — "Add a text box" creates a `Textbox` (not `IText`)

**Decision**: Use `new Textbox(...)` with `fontSize: 32`, `fontFamily: 'Inter'`, `fill: '#000000'`, `textAlign: 'center'`, `width: 200`, centred on the canvas.  
**Rationale**: `Textbox` supports word-wrap and is the canonical multi-line editable text type in Fabric.js 6. `IText` is for single-line inline editing.  
**Alternatives considered**: `IText` — rejected because it does not wrap and would be inconsistent with existing text objects on templates which are typically `textbox`.

### Decision 5 — History snapshot on blur, not on every keystroke

**Decision**: Call `canvasHistory.push('text:changed')` in the `(blur)` handler, not inside the debounced `valueChanges` subscription.  
**Rationale**: Identical to the pattern in `EditPanelComponent`. Pushing a snapshot on every keystroke would fill the undo history with single-character deltas. Blur represents a logical editing unit.  
**Alternatives considered**: Snapshot on every debounced change — rejected for the same reason as the existing panel.

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md).

### Component Contract

See [contracts/add-text-panel.contract.md](./contracts/add-text-panel.contract.md).

### Quickstart

See [quickstart.md](./quickstart.md).
