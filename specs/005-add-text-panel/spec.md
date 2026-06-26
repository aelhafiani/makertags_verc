# Feature Specification: Add Text Panel

**Feature Branch**: `005-add-text-panel`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Add Text Panel — implement the panel for adding and managing text objects on the design canvas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a New Text Box to the Design (Priority: P1)

A designer working on a tag or card design wants to add a text element. They click the **Add Text** tool in the left sidebar, which opens the "Add text to your design" panel. They click the **"Add a text box"** button, and a new editable text box appears centred on the canvas immediately. The new text is also listed as an editable input inside the panel, and the cursor/focus moves to it so they can type a label straight away.

**Why this priority**: This is the primary value of the feature — letting users place text on their design without friction. All other behaviours (editing, syncing) become meaningful only after text exists.

**Independent Test**: Can be fully tested by opening the editor with a blank canvas, clicking Add Text, pressing "Add a text box", and verifying that a text object is visible on the canvas and that a corresponding input appears in the panel.

**Acceptance Scenarios**:

1. **Given** the editor is open with the Add Text panel visible, **When** the user clicks "Add a text box", **Then** a text box with default content ("New text") appears centred on the canvas and is selected.
2. **Given** the user has just added a text box, **When** the panel list updates, **Then** a new input field appears in the list, pre-filled with "New text", and receives visual focus.
3. **Given** the user clicks "Add a text box" multiple times, **When** each click completes, **Then** each new text box appears as a separate input in the panel list.

---

### User Story 2 - Edit Existing Text from the Panel (Priority: P2)

A designer has several text objects on their canvas (e.g., a product name, a tagline, a price). They open the Add Text panel and see each text object listed as an editable input. They click on one input, the corresponding canvas object is highlighted/selected, and they type to update the text. The canvas reflects each keystroke without a page reload or save action.

**Why this priority**: Real-time text editing via the panel is the primary workflow for managing multiple text items without having to double-click each one individually on the canvas.

**Independent Test**: Can be fully tested by opening the editor with at least one existing text object, activating the Add Text panel, typing in an input field, and verifying the canvas text updates immediately.

**Acceptance Scenarios**:

1. **Given** the canvas has one or more text objects, **When** the Add Text panel opens, **Then** each text object is displayed as a separate, pre-filled editable input.
2. **Given** an input in the panel has focus, **When** the user types new text, **Then** the corresponding canvas text object updates within 100 ms of the last keystroke.
3. **Given** an input is clicked, **When** it receives focus, **Then** the canvas selects and visually highlights the corresponding text object.
4. **Given** the canvas has no text objects, **When** the panel opens, **Then** the list is empty with no error message shown.

---

### User Story 3 - Canvas-to-Panel Synchronisation (Priority: P3)

A designer selects a text object directly on the canvas (by clicking or tab-navigating). The Add Text panel responds by highlighting (blue border) the corresponding input field. Conversely, when the designer deletes a text object from the canvas, the matching input disappears from the panel list automatically.

**Why this priority**: Bidirectional sync prevents the panel from becoming stale and ensures designers always have an accurate, clickable list of text items regardless of how they interact with the canvas.

**Independent Test**: Can be fully tested by selecting a text object on the canvas while the panel is open, verifying the matching input is highlighted, then deleting the object and verifying the input is removed.

**Acceptance Scenarios**:

1. **Given** the Add Text panel is open, **When** the user selects a text object directly on the canvas, **Then** the corresponding panel input receives a blue-border highlight.
2. **Given** a text object is deleted from the canvas (via keyboard or toolbar), **When** the removal event fires, **Then** the corresponding input is removed from the panel list.
3. **Given** a text object's content is changed directly on the canvas (e.g., double-click edit), **When** the change is committed, **Then** the corresponding panel input updates to reflect the new text, provided the input does not currently have focus.

---

### Edge Cases

- What happens when the canvas has many text objects (e.g., 20+)? The panel list should scroll without breaking layout.
- What happens if a text object has an empty or whitespace-only value? The input is shown but left blank, without triggering an error.
- What happens if the user types in an input while the corresponding canvas object is simultaneously deleted? The update is safely discarded and the input is removed from the list.
- What happens if the Add Text panel is opened on a canvas page that has no text yet? The list is empty; only the "Add a text box" button is shown.
- What happens if the user switches to a different canvas page (face) while the panel is open? The list refreshes to reflect the text objects on the newly active page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the "Add text to your design" panel in the contextual panel area whenever the active sidebar tool is "Add Text".
- **FR-002**: The system MUST read all text-type objects from the active canvas page and render one editable input per object, pre-filled with the object's current text content, when the panel opens.
- **FR-003**: When a panel input receives focus, the system MUST select the corresponding canvas text object so it is visually active on the canvas.
- **FR-004**: When a user types in a panel input, the system MUST update the corresponding canvas text object's content with a debounce of no more than 100 ms after the final keystroke.
- **FR-005**: The "Add a text box" button MUST create a new text object centred on the canvas with sensible default properties (readable size, neutral colour, centred alignment), add it to the canvas, select it, and append a corresponding input to the panel list.
- **FR-006**: The panel list MUST update automatically when a text object is added to or removed from the canvas, without requiring a manual refresh.
- **FR-007**: When a text object is selected directly on the canvas, the system MUST apply a distinct visual indicator (highlighted border) to the matching panel input.
- **FR-008**: When a text object's content changes via direct canvas editing and the corresponding panel input does not have keyboard focus, the system MUST update the input's displayed value.
- **FR-009**: The panel MUST display an empty list with no error message when no text objects exist on the active canvas page.
- **FR-010**: The panel MUST NOT expose text styling controls (font family, size, colour, weight). These belong exclusively to the floating formatting toolbar.
- **FR-011**: The panel MUST be integrated into the existing contextual panel routing so it appears and disappears as the user switches tools, consistent with all other tool panels.

### Key Entities

- **Text Object**: A canvas element of type text or rich-text box. Key attributes: unique identity within the canvas, display text content, position, dimensions, and selection state.
- **Panel Input Row**: A UI element in the panel list that mirrors one Text Object. Attributes: bound text value, focus/highlight state, and scroll visibility.
- **Add Text Panel**: The container panel that holds the section header, the dynamic list of Panel Input Rows, and the "Add a text box" action button.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A designer can add a text box to the canvas and see it reflected in the panel list in under 1 second from clicking the button.
- **SC-002**: Text typed in a panel input is reflected on the canvas within 100 ms of the user pausing typing, with no visible lag on designs containing up to 30 text objects.
- **SC-003**: Selecting a canvas text object highlights the correct panel input in under 200 ms, measured across all text objects on the active page.
- **SC-004**: 100% of text-type objects on the active canvas page are listed in the panel when it opens — no silent omissions.
- **SC-005**: Deleting a text object from the canvas removes the corresponding panel input within one render cycle, leaving no stale rows.
- **SC-006**: The panel list remains scrollable and fully functional with up to 30 text objects, with no layout overflow or broken interactions.

## Assumptions

- The editor already has a contextual panel host component that switches content based on the active sidebar tool; this feature plugs into that existing routing mechanism.
- A canvas provider service is already available that exposes the active canvas instance and reactive streams for the active object and canvas-level events (object:added, object:removed, object:modified, text:changed).
- The "Add Text" tool entry in the sidebar already exists; this feature only implements the panel content, not the sidebar button itself.
- Default text object properties (readable font, 32-point size, black fill, centred, 200 px width) are acceptable starting values; designers adjust styling via the floating toolbar after creation.
- Text style editing (font, size, colour, weight) is explicitly out of scope — it is handled by the floating formatting toolbar that appears when a text object is selected.
- Drag-and-drop reordering of panel inputs is out of scope for this feature.
- Multiple text-type presets (heading, body, caption) are out of scope; only a single generic "Add a text box" action is provided.
- The feature targets the desktop editor viewport; mobile/touch behaviour is not required for this iteration.
