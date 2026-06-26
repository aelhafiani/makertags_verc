# Tasks: Editor Current State — Existing Functionality Audit

**Input**: Design documents from `/specs/001-editor-current-state/`  
**Branch**: `001-editor-current-state`  
**Nature**: Audit — all tasks are read-verify-update. No production code is written.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (independent files, no shared state)
- **[Story]**: Which user story this task verifies (US1–US5)
- Each task targets a specific source file at a specific path

---

## Phase 1: Setup

**Purpose**: Confirm audit scope and align documentation artifacts with existing source files.

- [X] T001 Confirm `specs/001-editor-current-state/spec.md` status is `Draft` and update header **Updated** date to today
- [X] T002 [P] Verify `specs/001-editor-current-state/data-model.md` reflects `src/app/modules/shared/domaine/entities/art.ts` — add any fields present in source that are missing from the data model
- [X] T003 [P] Read `src/app/modules/shared/services/art-docs.service.ts` top-level exports and confirm all Supabase operations used by the editor are documented in `specs/001-editor-current-state/contracts/supabase-api.md`

---

## Phase 2: Foundational (Canvas Initialization)

**Purpose**: Verify the core canvas bootstrap sequence that all user stories depend on.

**⚠️ CRITICAL**: US1–US5 audit tasks all assume canvas initialization is understood. Complete this phase first.

- [X] T004 Read `src/app/modules/author/components/author/author.component.ts` lines 440–550 (`ngAfterViewInit`, canvas init, Fabric.js global defaults) — confirm FR-001 (grey background + dashed border) and FR-003 (object rendering) match actual code; update spec if discrepant
- [X] T005 Read the `selectedPage$` subscription block in `src/app/modules/author/components/author/author.component.ts` (search for `selectedPage$.pipe`) — verify that face switching calls `canvas.loadFromJSON(page.canvasContent)` as documented in FR-003a; update `data-model.md` face state-transition table if needed
- [X] T006 [P] Read `src/app/modules/shared/services/new-art.facade.ts` — locate `artDocState$` selector and the method used to load the art document on editor open; confirm `IArtDoc` is loaded from Supabase via NGXS on route activation; update `contracts/supabase-api.md` Load Art Document section if the method name or shape differs

**Checkpoint**: Canvas initialization is fully documented. Face switching, template load, and object rendering paths are verified.

---

## Phase 3: User Story 1 — Canvas & Template Rendering (Priority: P1)

**Goal**: Verify that FR-001–FR-003a are accurately described in the spec and that the acceptance scenarios are testable against real code.

**Independent Test**: Load any template via the editor route and verify the canvas renders all objects at correct positions with correct styles.

- [X] T007 [US1] Read `src/app/modules/author/components/author/author.component.html` canvas section (the `<canvas id="fabricSurface">` block and its parent `.canvas-content` div) — verify FR-001 (grey background, dashed border) against actual CSS classes/inline styles; update spec FR-001 wording if the background is `#fff` (white) not grey as stated
- [X] T008 [US1] Read `src/app/modules/author/components/author/author.component.ts` — locate `loadFromJSON` call and confirm it uses `canvas.loadFromJSON(page.canvasContent)` (standard Fabric.js API as stated in Assumptions); update Assumptions section in spec if a different method or wrapper is used
- [X] T009 [P] [US1] Read `src/app/modules/author/components/art-doc/art-doc.component.ts` — determine whether this component is involved in template rendering or if `AuthorLayoutComponent` handles all rendering directly; if `ArtDocComponent` is part of the rendering chain, add it to the spec's component inventory in plan.md

**Checkpoint**: US1 spec claims are verified against source. Grey/white canvas background discrepancy resolved in spec.

---

## Phase 4: User Story 2 — Inline Text Editing (Priority: P2)

**Goal**: Verify that Fabric.js inline text editing (FR-004, FR-005) behaves exactly as described in the spec acceptance scenarios.

**Independent Test**: Click a text object, type new content, click elsewhere, verify the new text persists on the canvas (no intermediate steps required).

- [X] T010 [US2] Read `src/app/modules/author/components/author/author.component.ts` — search for `mouse:dblclick`, `text:editing:entered`, `itext:changed`, or equivalent Fabric.js text event handlers; confirm FR-004 (single-click to edit inline) — update spec if double-click is required instead of single-click
- [X] T011 [US2] Read the `selection:cleared` / `object:modified` event handler in `src/app/modules/author/components/author/author.component.ts` — verify FR-005 (inline text changes persisted on deselect) and confirm whether `saveUserArt()` is triggered on every text change or only on explicit deselect; update spec FR-005 and SC-002 accordingly
- [X] T012 [P] [US2] Read `src/app/modules/author/components/text-editor/text-style/text-style.component.ts` — document what bold/italic/underline controls are available for selected text; add to spec as a note under FR-004 (contextual editor appears on selection)

**Checkpoint**: US2 spec is accurate. Single-click vs. double-click clarified. Auto-save trigger documented.

---

## Phase 5: User Story 3 — Bottom Tab Navigation (Priority: P3)

**Goal**: Verify the 4 tabs and their tool areas match spec FR-006–FR-008. Apply the 3 corrections from research.md (Import = image picker; Marque = stub; Elements = category-grouped asset picker).

**Independent Test**: Click each of the 4 tabs and verify each opens its tool area without disrupting the canvas.

- [X] T013 [US3] Update `spec.md` User Story 3 and FR-006 to correct the **Import tab** behavior: it opens a native file picker (`input[type=file]`, `accept="image/*"`) and adds the selected image to the canvas as a `FabricImage` — it does NOT import a Fabric.js JSON file (as previously stated in the spec)
- [X] T014 [US3] Update `spec.md` User Story 3 to document the **Marque tab** as a non-functional stub: `AddMarqueComponent` (`src/app/modules/author/components/add-marque/add-marque.component.ts`) has no implementation; clicking the tab opens an empty drawer; add an explicit note that this is a known gap and Phase 1 must decide whether to implement or remove it
- [X] T015 [P] [US3] Read `src/app/modules/author/components/add-text/add-text.component.ts` — document what the Text tab currently provides (text presets? font selector? add-new-text button?); update spec User Story 3 "What each tab currently does: Text" bullet with verified behavior
- [X] T016 [P] [US3] Read `src/app/modules/author/components/add-elements/add-elements.component.ts` — confirm Elements tab groups assets by `categorie` from Supabase, renders basic shapes (`square`, `circle`, `triangle`, `line`) and category-fetched images; update spec and confirm it matches `data-model.md` Elements section

**Checkpoint**: All 4 tabs are accurately documented. Import and Marque corrections applied to spec. Spec has no remaining incorrect claims about tab behavior.

---

## Phase 6: User Story 4 — Topbar (Priority: P4)

**Goal**: Verify all topbar elements (FR-009, FR-010) match the HTML source and document the Actions dropdown contents precisely.

**Independent Test**: Open the editor and verify all topbar elements are present and respond to clicks.

- [X] T017 [US4] Read `src/app/modules/author/components/author/author.component.html` header section (lines 1–95) — verify FR-009 lists the correct topbar elements; note that **Save Art is admin-only** (`*ngIf="isAdmin$ | async"`) — update spec FR-009 and User Story 4 acceptance scenario 2 to reflect the admin-only constraint; add a note that non-admin users see only Share button and Avatar
- [X] T018 [US4] Read `src/app/modules/author/components/share-options/share-options.component.ts` — document what the Share button (`openShareMenu()`) currently does; update User Story 4 acceptance scenario (currently says only "a dropdown of additional actions appears" which is for Actions, not Share); add a separate acceptance criterion for the Share button behavior
- [X] T019 [P] [US4] Read the Actions dropdown items in `author.component.html` (lines 46–72) — document all current action items (ungroup, group, lockMovement, unlockMovement, Mask, UndoMask, DuplicateObject, Download JSON); update spec User Story 4 FR-009 and the Actions acceptance scenario with the complete action list; note these are admin-only

**Checkpoint**: Topbar is fully documented including admin/user role differentiation. Share button behavior is specified.

---

## Phase 7: User Story 5 — Mobile Preview (Priority: P5)

**Goal**: Locate the mobile preview implementation, verify FR-011 and SC-004, and document how the preview is triggered and what it renders.

**Independent Test**: Open the preview while a design is loaded and verify it accurately reflects the current canvas state.

- [X] T020 [US5] Search `src/app/modules/author/components/author/author.component.ts` for `preview`, `mobilePreview`, `openPreview`, or similar identifiers — locate the method that triggers the mobile preview; if no dedicated mobile preview exists and the preview is generated via `generated_preview_url` / `previewImage` property, document that and update spec FR-011 and User Story 5 to reflect the actual mechanism
- [X] T021 [P] [US5] Read `src/app/modules/author/components/author/author.component.html` — search for the mobile preview UI element (modal, drawer, or overlay); document the trigger control (button location, label) and the preview rendering approach (HTML img tag with base64? `<canvas>` element?); update User Story 5 acceptance scenarios with the verified trigger mechanism

**Checkpoint**: Mobile preview is located and documented. FR-011 and SC-004 are verified accurate or corrected.

---

## Phase 8: Edge Cases

**Goal**: Resolve the two remaining "to be confirmed" edge cases in the spec Edge Cases section.

- [X] T022 Read `src/app/modules/author/components/author/author.component.ts` line ~551 (the `if (!this.art?.canvasContent || Object.keys(this.art?.canvasContent).length === 0)` block) — document exactly what happens when the editor loads an empty canvas; verify the spec edge case ("blank slate with no objects") is accurate; update if a different fallback is applied (e.g. loading a default template or redirecting)
- [X] T023 [P] Read `src/app/modules/author/components/add-import/add-import.component.ts` and the `onFileSelected()` handler in `author.component.ts` — determine if there is any validation or error handling for unsupported file types; update the spec edge case "What happens when the imported JSON is malformed?" to reflect the actual file type (image, not JSON) and document what happens if a non-image file is selected (e.g., silent failure, browser-level validation via `accept="image/*"`, or explicit error message)

**Checkpoint**: All three spec edge cases resolved. No remaining "to be confirmed" markers in spec.

---

## Phase 9: Polish & Final Spec Consolidation

**Purpose**: Ensure the complete audit artifact set is consistent, complete, and ready for handoff to Phase 1.

- [X] T024 [P] Scan `specs/001-editor-current-state/spec.md` for any remaining "to be confirmed" or "TODO" markers — resolve each by either reading the relevant source file or marking as "deferred to Phase 1"; update spec **Status** from `Draft` to `Complete`
- [X] T025 [P] Cross-check terminology consistency across `spec.md`, `data-model.md`, `research.md`, and `contracts/` — confirm `IArtDoc`, `IArtPage`, `face`, `page`, `canvasContent`, and `Fabric.js JSON` are used consistently with no synonyms; update any files with inconsistent terminology
- [X] T026 Update `specs/001-editor-current-state/spec.md` **Updated** date and add a summary note at the top of the Assumptions section confirming: "All assumptions in this spec have been verified against the codebase as of 2026-04-11 except where explicitly noted as deferred"
- [X] T027 [P] Run a final read of `src/app/modules/author/components/author/author.component.ts` lines 1–50 (imports) — confirm no editor-relevant services or components are imported that are not yet documented in the spec or plan; add any missing component references to `plan.md` Project Structure section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002 and T003 can run in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 — T004, T005, T006 can run in parallel with each other once Phase 1 completes
- **User Stories (Phases 3–7)**: All depend on Phase 2 completion (canvas initialization must be understood first)
  - US1 (Phase 3), US2 (Phase 4), US3 (Phase 5) can proceed in parallel after Phase 2
  - US4 (Phase 6) and US5 (Phase 7) are independent of US1–US3 and can also run in parallel after Phase 2
- **Edge Cases (Phase 8)**: Independent — can run in parallel with any user story phase after Phase 2
- **Polish (Phase 9)**: Depends on all prior phases completing

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (canvas init) — no dependency on other stories
- **US2 (P2)**: Depends on Phase 2 — independent of US1
- **US3 (P3)**: Depends on Phase 2 — independent of US1/US2
- **US4 (P4)**: Depends on Phase 2 — independent of US1–US3
- **US5 (P5)**: Depends on Phase 2 — independent of US1–US4

### Within Each Phase

- Tasks marked [P] can be executed in parallel (different files, no shared state)
- Non-[P] tasks within a phase are sequential (spec update depends on read findings)
- Spec updates (write to `spec.md`) should NOT run in parallel to avoid conflicts

### Parallel Opportunities

- T002, T003 (Phase 1) — parallel
- T004, T005, T006 (Phase 2) — parallel
- T009 (US1), T012 (US2), T015, T016 (US3), T019 (US4), T021 (US5) — parallel across stories
- T022, T023 (Phase 8) — parallel
- T024, T025, T027 (Phase 9) — parallel

---

## Parallel Example: Phases 3–7 After Foundational Completes

```text
# Once Phase 2 is done, launch all user story audits together:
Task T007: Verify canvas rendering (US1) in author.component.html
Task T010: Verify inline text editing (US2) in author.component.ts
Task T013: Apply Import tab correction (US3) in spec.md
Task T017: Verify topbar admin-only constraint (US4) in spec.md
Task T020: Locate mobile preview trigger (US5) in author.component.ts
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + US1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational canvas audit (T004–T006)
3. Complete Phase 3: US1 canvas rendering audit (T007–T009)
4. **STOP and VALIDATE**: Is the canvas rendering story fully accurate in the spec? If yes, proceed.
5. This gives you a verified, accurate baseline for the most critical editor feature before touching lower-priority stories.

### Full Audit Delivery

1. Setup + Foundational → canvas initialization documented
2. US1–US5 audits (can run in parallel) → all stories verified
3. Edge cases → all "to be confirmed" markers resolved
4. Polish → spec promoted to `Complete`, ready for Phase 1 handoff

---

## Notes

- [P] tasks operate on different files (or read-only) and have no shared write conflicts
- All spec updates should be minimal and surgical — preserve existing formatting and heading hierarchy
- Each "to be confirmed" marker removed = one unit of audit progress
- The audit is complete when: (a) spec status = `Complete`, (b) zero "to be confirmed" markers remain, (c) research.md, data-model.md, and contracts/ are consistent with spec
- Marque tab stub and Import-as-image-picker are the two highest-visibility corrections — prioritize T013 and T014 early as they affect Phase 1 scope decisions
