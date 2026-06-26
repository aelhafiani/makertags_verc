# Feature Specification: Editor Current State — Existing Functionality Audit

**Feature Branch**: `001-editor-current-state`  
**Created**: 2026-04-11  
**Updated**: 2026-04-12  
**Status**: Complete

---

## Purpose

This spec documents current editor behavior in the existing Angular/Fabric.js implementation. It is an audit baseline for redesign work, not a future-state design.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load a Template and View It on the Canvas (Priority: P1)

A user opens the editor with an existing art document. The active face is loaded into Fabric.js using `canvas.loadFromJSON(page.canvasContent)`. The canvas area is rendered in a white zone (`background: #fff`) and the canvas element has a 1px white border.

**Independent Test**: Load any art document and verify the active face renders with all objects at expected positions/styles.

**Acceptance Scenarios**:

1. **Given** an art document is loaded, **When** the editor initializes the active face, **Then** objects are rendered from `page.canvasContent` via Fabric.js `loadFromJSON`.
2. **Given** the page switcher drawer is open, **When** the user selects another face, **Then** the selected face is loaded and rendered on the same canvas.

---

### User Story 2 - Edit Text Directly on the Canvas (Priority: P2)

A user edits text directly on the canvas using Fabric.js inline text editing. No separate form is required for the actual text input.

**Independent Test**: Select a text object, edit content inline, and verify content remains after deselection/re-render.

**Acceptance Scenarios**:

1. **Given** text objects exist, **When** the user enters Fabric text editing mode (Fabric default desktop behavior; double-tap helper on mobile), **Then** text is editable inline.
2. **Given** text has changed, **When** text/object change events fire, **Then** `setContentCanvasInState()` updates face `canvasContent`; for non-admin users, debounced auto-save (`saveUserArt`) persists face changes.

---

### User Story 3 - Navigate Tools via Bottom Tabs (Priority: P3)

The bottom toolbar shows 4 tabs: Text, Elements, Marque, Import.

**Independent Test**: Click each tab and verify the resulting drawer behavior.

**Acceptance Scenarios**:

1. **Given** the editor is open, **When** the bottom menu is visible, **Then** Text/Elements/Marque/Import tabs are shown.
2. **Given** Text is clicked, **Then** `AddTextComponent` opens and provides text preset actions (`addText`/`addTextBox`).
3. **Given** Elements is clicked, **Then** `AddElementsComponent` opens and lists Supabase assets grouped by `categorie` (admin includes `models`; non-admin excludes `models`).
4. **Given** Marque is clicked, **Then** the drawer opens with no wired component (`'marque'` is not mapped in `listAddElementComponentsMenu`), making it a known non-functional stub.
5. **Given** Import is clicked, **Then** a hidden file input (`accept="image/*"`) is triggered and selected image files are added as `FabricImage` objects.

---

### User Story 4 - View the Current Topbar (Priority: P4)

The topbar contains Logo, Share button, Avatar, and admin-gated controls.

**Independent Test**: Verify topbar visibility for admin and non-admin accounts.

**Acceptance Scenarios**:

1. **Given** any authenticated user, **When** topbar renders, **Then** Logo, Share, and Avatar are shown.
2. **Given** an admin user (`isAdmin$` true), **When** topbar renders, **Then** Save Art and Actions dropdown are shown; non-admin users do not see these controls.
3. **Given** Actions is opened (admin only), **Then** menu items are: `ungroup`, `group`, `lockMovement`, `UnlockMovement`, `Mask`, `UndoMask`, `DuplicateObject`, `Download JSON`.
4. **Given** Share is clicked, **Then** Share drawer opens (`ShareOptionsComponent`) with `Download & Export` and `Create Public Link`.

---

### User Story 5 - Share Preview Generation (Priority: P5)

There is no dedicated “mobile preview simulator” UI in `author.component.html`. Current preview generation is tied to the Share flow.

**Independent Test**: Click Share → Create Public Link and verify preview image generation/upload.

**Acceptance Scenarios**:

1. **Given** user chooses public sharing, **When** share flow runs, **Then** canvas PNG is generated via `toDataURL`, uploaded to Supabase storage, and passed to `SharePublicLinkComponent` modal as `previewUrl`.
2. **Given** preview generation/upload fails, **When** errors occur, **Then** the user sees a failure message (`Failed to generate preview`).

---

### Edge Cases

- Empty or missing face content (`!art?.canvasContent` or empty object) initializes a blank white canvas state without crashing.
- Import flow is image-only (`accept="image/*"`). There is no explicit custom validation/error messaging for unsupported files beyond browser picker constraints and Fabric image loading behavior.
- Marque tab is visible in UI but not connected to a component mapping; opening it yields an empty drawer state.

---

## Requirements *(mandatory)*

### Functional Requirements

**Canvas & Face Rendering**

- **FR-001**: System MUST render the canvas area in a white background zone and initialize a Fabric canvas (`#fabricSurface`) with white background.
- **FR-002**: System MUST load face objects from serialized face content using Fabric.js `loadFromJSON`.
- **FR-003**: System MUST preserve object positioning/style from serialized content on render.
- **FR-003a**: System MUST provide a visible face-switch control (`>>`) that opens a right drawer and switches active face via `selectedPage$`.

**Inline Text Editing**

- **FR-004**: System MUST support Fabric inline text editing for `i-text`/`textbox` objects (desktop Fabric default behavior; mobile helper for tap-to-edit flow).
- **FR-005**: System MUST persist text/object modifications into face state (`canvasContent`), and MUST auto-save for non-admin users through debounced face updates.

**Bottom Tab Navigation**

- **FR-006**: System MUST display bottom tabs: Text, Elements, Marque, Import.
- **FR-007**: System MUST open a bottom/right drawer for tab content actions.
- **FR-008**: System MUST keep one add-in drawer context active at a time.
- **FR-008a**: Marque tab is currently non-functional (known gap).
- **FR-008b**: Import tab MUST trigger image file selection and add selected images to canvas.

**Topbar**

- **FR-009**: System MUST display topbar containing Logo, Share button, Avatar, plus admin-only Save Art and Actions controls.
- **FR-010**: System MUST persist full art document pages when admin clicks Save Art (`updateArtDocPages`).

**Share/Preview**

- **FR-011**: System MUST generate preview image data from the current canvas during share public-link flow and upload it to Supabase storage for share modal use.

---

### Key Entities

- **IArtDoc**: Top-level art document containing metadata and `pages`.
- **IArtPage**: Face/page entry containing `canvasContent`, `preview`, and side info.
- **Canvas Object**: Fabric runtime object (`i-text`, `textbox`, `image`, `group`, shapes/paths).
- **Tool Tab**: Bottom toolbar entry (`Text`, `Elements`, `Marque`, `Import`) controlling add-in drawer behavior.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Face switching reliably reloads selected face content with `loadFromJSON`.
- **SC-002**: Text edits made inline are reflected in persisted face `canvasContent`.
- **SC-003**: Text/Elements/Import tabs execute their current implemented behaviors without runtime errors.
- **SC-004**: Share public-link flow generates and passes a valid `previewUrl` to share modal on success.
- **SC-005**: Admin Save Art persists page updates and displays success feedback.

---

## Assumptions

All assumptions in this spec have been verified against the codebase as of 2026-04-11 except where explicitly noted as deferred.

- Fabric.js is the canvas runtime for editor rendering and interaction.
- Face selection is driven by the exported `selectedPageIndexSubj` BehaviorSubject in `pages-selector.component.ts`.
- Import behavior is image-based, not JSON import.
- Marque functionality is intentionally documented as a current implementation gap (visible tab, no wired add-in component).
- “Preview” in current codebase refers to share/public-link preview generation, not a separate simulated mobile preview panel.
