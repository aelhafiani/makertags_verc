# Tasks: Add Text Panel

**Input**: Design documents from `/specs/005-add-text-panel/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Create new component files on disk so Phase 2 tasks can proceed in parallel.

- [X] T001 Create empty component files: `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts`, `add-text-panel.component.html`, `add-text-panel.component.scss`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Scaffold the component class and wire it into the contextual panel router. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Implement the `AddTextPanelComponent` class scaffold in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — standalone, `OnPush`, selector `maker-tags-add-text-panel`, inject `CanvasProviderService`, `CanvasHistoryService`, `EditorAnnouncerService`, `ChangeDetectorRef`; declare `fields: EditablePanelField[]`, `focusedObjectId: string | null`, private `canvas: Canvas | null`, private `destroy$` and `formDestroy$` Subjects; stub `ngOnInit()` and `ngOnDestroy()` lifecycle hooks using `takeUntil(destroy$)` pattern
- [X] T003 Register `'add-text': AddTextPanelComponent` in the `TOOL_TO_COMPONENT` map in `src/app/modules/author/components/shell/contextual-panel/contextual-panel.component.ts` and add `AddTextPanelComponent` to the component's `imports` array
- [X] T004 [P] Implement `rebuildList()` private method in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — call `buildFieldsFromCanvas(this.canvas)` from `edit-panel.types.ts`, assign result to `this.fields`, rebuild `this.form` as a `FormGroup` with one `FormControl<string | null>` per field keyed by `field.objectId`, emit `formDestroy$.next()` before replacing the form, call `this.cdr.markForCheck()`
- [X] T005 [P] Subscribe to `canvasProvider.canvas$` in `ngOnInit()` in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — on non-null canvas: store reference, attach canvas events `object:added` and `object:removed` (both call `rebuildList()` then `cdr.markForCheck()`), then call `rebuildList()`; on null canvas: reset `fields`, `canvas`, and form; tear down canvas event listeners on `ngOnDestroy()`

**Checkpoint**: Component is registered, mounts when 'add-text' tool is active, reads existing text objects from canvas, and shows them as inputs. Edits are not yet wired.

---

## Phase 3: User Story 1 — Add a New Text Box (Priority: P1) 🎯 MVP

**Goal**: User can click "Add a text box" to place a centred `Textbox` on the canvas; the new object appears immediately as an editable input row in the panel list.

**Independent Test**: Open editor with a blank canvas → activate Add Text panel → click "Add a text box" → verify a text box with "New text" appears on canvas and a corresponding input row appears in the panel. Repeat to confirm multiple boxes work independently. See quickstart.md Scenario 1.

- [X] T006 [US1] Implement `addTextBox()` method in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — create `new Textbox('New text', { fontSize: 32, fontFamily: 'Inter', fill: '#000000', textAlign: 'center', width: 200 })`, set `left` and `top` to centre it on the canvas (`canvas.width / 2 - 100`, `canvas.height / 2 - 20`), call `canvas.add(obj)`, `canvas.setActiveObject(obj)`, `canvas.requestRenderAll()`, then call `canvasHistory.push('object:added')` and `announcer.announce('Text box added')`
- [X] T007 [US1] Write the component template in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.html` — panel header section with `<h3>` "Add text to your design" and `<p>` "Add additional text to your design"; a `<form [formGroup]="form">` containing `*ngFor` over `fields` rendering one `<input nz-input>` per field with `[formControlName]="field.objectId"`, `[id]="field.objectId"`, `(focus)="onInputFocus(field)"`, `(blur)="onInputBlur()"`, and `[class.focused]="field.objectId === focusedObjectId"`; below the form, a full-width `<button nz-button nzType="primary" (click)="addTextBox()">` containing an `<span nz-icon nzType="font-size"></span>` and the label "Add a text box"; render nothing (no message) when `fields.length === 0`
- [X] T008 [US1] Write base SCSS in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.scss` — host block: white background, `padding: 16px`; `.panel-header` with `h3` at `font-size: 14px; font-weight: 600` and `p` at `font-size: 12px; color: #6b7280`; `.field-list` with `display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px`; `input` rows: `width: 100%; height: 38px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 12px; font-size: 13px`; button: `width: 100%; height: 40px; border-radius: 8px; font-weight: 600`

**Checkpoint**: Click "Add a text box" → text box appears on canvas + input row appears in panel list. Multiple clicks produce multiple independent rows. ✅ US1 independently testable.

---

## Phase 4: User Story 2 — Edit Existing Text from the Panel (Priority: P2)

**Goal**: All existing text objects on the canvas are listed as editable inputs; typing in an input updates the canvas text in near-real-time; clicking an input selects the canvas object; blurring pushes a history snapshot.

**Independent Test**: Open editor with one or more existing text boxes → activate Add Text panel → verify inputs pre-filled → type in an input → verify canvas updates → blur → verify undo reverts the change. See quickstart.md Scenario 2.

- [X] T009 [US2] Implement `onInputFocus(field: EditablePanelField)` method in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — find the canvas object with `canvas.getObjects().find(o => (o as any).id === field.objectId)`, call `canvas.setActiveObject(obj)` and `canvas.requestRenderAll()` if found
- [X] T010 [US2] Implement `onInputBlur()` method in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — call `canvasHistory.push('text:changed')` and `announcer.announce('Text updated')`
- [X] T011 [US2] Wire the debounced `valueChanges` subscription inside `rebuildList()` in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — after rebuilding the form, subscribe to `this.form.valueChanges.pipe(debounceTime(80), takeUntil(this.formDestroy$), takeUntil(this.destroy$))` and in the handler: for each field, find the canvas object by `id`, call `obj.set('text', newValue)`, update `field.value`, then call `canvas.requestRenderAll()` if any change was made
- [X] T012 [US2] Add `.focused` input style to `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.scss` — `input.focused { border: 1.5px solid #2563eb; outline: none; }`

**Checkpoint**: Existing text boxes appear in the list pre-filled; typing updates canvas; blur creates an undo point. ✅ US2 independently testable (builds on US1 scaffold).

---

## Phase 5: User Story 3 — Canvas-to-Panel Synchronisation (Priority: P3)

**Goal**: Selecting a text object directly on the canvas highlights the matching panel input; deleting a canvas text object removes its input row; editing text directly on canvas keeps the panel input value in sync.

**Independent Test**: With two text boxes on canvas and panel open — click one text box on canvas → verify blue border on matching input → delete the text box → verify input row disappears. See quickstart.md Scenarios 3 and 4.

- [X] T013 [US3] Subscribe to `canvasProvider.activeObject$` in `ngOnInit()` in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` using `takeUntil(destroy$)` — on each emission: cast to `FabricObject & { id?: string }`, set `this.focusedObjectId = obj?.id ?? null`, call `cdr.markForCheck()`
- [X] T014 [US3] Subscribe to canvas `object:modified` and `text:changed` events inside the `canvas$` subscription in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` — in the handler: receive the modified object, find its matching field by `id`, if the corresponding form control does not currently have focus then call `control.setValue(obj.text, { emitEvent: false })` and update `field.value`, then call `cdr.markForCheck()`

**Checkpoint**: Canvas selection highlights the panel input; deletion removes the row; direct canvas edits sync back to the panel. ✅ US3 independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, edge-case validation, and final integration check.

- [X] T015 Verify empty state in `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.html` — confirm that when `fields.length === 0` the template renders no placeholder message and no error (only header + button are visible); no additional code needed if template already renders form conditionally, otherwise wrap the form with `*ngIf="fields.length > 0"`
- [ ] T016 Run the 5 quickstart.md manual scenarios against the running dev server (`ng serve`) and confirm all pass: (1) add text box, (2) edit existing text, (3) canvas selection → panel highlight, (4) delete → row removed, (5) empty canvas — no error

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2 completion (can start in parallel with US1 once Phase 2 is done)
- **US3 (Phase 5)**: Depends on Phase 2 completion (can start in parallel with US1/US2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on US2 or US3 — independently testable after Phase 2
- **US2 (P2)**: No dependency on US1 or US3 — shares the component scaffold, independently testable after Phase 2
- **US3 (P3)**: No dependency on US1 or US2 — independently testable after Phase 2

### Within Each Phase

- T002 and T004/T005 within Phase 2: T002 must complete before T004/T005 (T004 and T005 can run in parallel after T002; both require the class to exist)
- T003 can run in parallel with T004/T005 (different file)
- Within US1: T006 before T007 (template references the method); T008 can run in parallel with T006/T007
- Within US2: T009, T010, T011 can run in parallel (all are method additions); T012 is independent (SCSS only)
- Within US3: T013 and T014 are independent method additions (can run in parallel)

---

## Parallel Example: Phase 2 (Foundational)

```
# After T001 (file creation) and T002 (scaffold) complete, run in parallel:
T003 — Register in ContextualPanelComponent  (different file)
T004 — Implement rebuildList()               (same file, different method)
T005 — Subscribe to canvas$ in ngOnInit()    (same file, different method)
```

## Parallel Example: User Story 1

```
# T006 must complete first (method needed by template), then in parallel:
T007 — Write component template (references addTextBox, onInputFocus, onInputBlur, form)
T008 — Write base SCSS (no code dependency)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T005) — **required, blocks everything**
3. Complete Phase 3: US1 (T006–T008)
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 — "Add a text box" flow works end-to-end
5. Demo: designer can add a text box via the panel

### Incremental Delivery

1. Setup + Foundational (T001–T005) → component mounts, reads existing text objects
2. US1 (T006–T008) → "Add a text box" button works ✅ Demo ready
3. US2 (T009–T012) → editing text from panel works ✅ Core editing loop complete
4. US3 (T013–T014) → bidirectional canvas sync works ✅ Full feature complete
5. Polish (T015–T016) → edge cases validated ✅ Ship ready

---

## Notes

- `buildFieldsFromCanvas()` from `edit-panel.types.ts` is reused as-is — do not duplicate it
- `EditablePanelField` type is imported from `edit-panel.types.ts` — no new type file needed
- The `[P]` marker on T003, T004, T005 means they touch different methods/files and can be run concurrently after T002
- `formDestroy$.next()` must be called before every `rebuildList()` to prevent duplicate `valueChanges` subscriptions
- Fabric.js canvas events (`object:added`, etc.) are imperative; always call `cdr.markForCheck()` after mutating component state in those handlers
- Do not add style controls (font, size, colour) — those belong to the floating toolbar
