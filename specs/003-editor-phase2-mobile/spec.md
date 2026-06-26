# Feature Specification: Editor Phase 2 — Mobile Responsive Layout

**Feature Branch**: `003-editor-phase2-mobile`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "read EDITOR_REDESIGN_PLAN and generate a spec for phase 2"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Design a Tag on a Smartphone (Priority: P1)

A customer opens the tag editor on a mobile phone (viewport < 768px). Instead of the desktop sidebar and side panels, they see the canvas taking up the full screen, with a simplified bottom tab bar. They tap "Edit" to open the Personalize panel as a bottom sheet, type their name in the text fields, apply changes, and see the canvas update — all without needing a desktop browser.

**Why this priority**: This is the core mobile experience. Without a usable canvas and a way to access the Personalize panel on mobile, no other mobile feature matters. This represents the largest currently unserved user group.

**Independent Test**: Can be fully tested by opening the editor on a device or browser resized to 375px wide, tapping "Edit" in the bottom tabs, filling in a field, and confirming the canvas reflects the change.

**Acceptance Scenarios**:

1. **Given** a user opens the editor on a mobile device (viewport < 768px), **When** the editor loads, **Then** the canvas fills the full screen width, the bottom tab bar is visible with up to 5 tool tabs, and no desktop sidebar or right preview column is shown.
2. **Given** the mobile editor is open, **When** the user taps the "Edit" tab, **Then** a bottom sheet slides up to approximately 50% of the screen height, revealing the Personalize form fields for the active template face.
3. **Given** the bottom sheet is open, **When** the user types in a text field and taps "Apply changes", **Then** the canvas updates to reflect the new text and the bottom sheet can be dismissed.

---

### User Story 2 - Use a Bottom Sheet to Browse Tool Panels (Priority: P2)

A user on a tablet (768–1023px) wants to add a text box and adjust the background color. They tap the relevant tools in the compact icon-only sidebar, which opens each panel as an overlay rather than pushing the canvas aside.

**Why this priority**: Tablet users represent an intermediate case. The collapsed icon-only sidebar preserves canvas space while still offering access to all tools. This unlocks the full panel set on medium screens without requiring the full desktop layout.

**Independent Test**: Can be fully tested on a viewport resized to 900px wide by verifying the sidebar shows icons without labels, tapping each tool icon opens that panel as an overlay on top of the canvas, and the canvas remains visible behind the overlay.

**Acceptance Scenarios**:

1. **Given** a user opens the editor on a tablet (768–1023px), **When** the editor loads, **Then** the left sidebar shows tool icons without text labels, and no panel is open by default.
2. **Given** the tablet layout is active, **When** the user taps a sidebar tool icon, **Then** the corresponding panel opens as an overlay on top of the canvas without resizing the canvas area.
3. **Given** a panel overlay is open, **When** the user taps outside the panel or presses the panel's close button, **Then** the panel closes and the full canvas is again unobstructed.

---

### User Story 3 - Interact with Selected Objects via Mobile Toolbar (Priority: P3)

A mobile user taps a text element on the canvas to select it. Instead of a floating toolbar appearing above the object, a compact contextual toolbar appears at the bottom of the screen, just above the tab bar. The user adjusts font size and color directly from this bottom toolbar.

**Why this priority**: Contextual editing (font, color, size) is a key part of the desktop Phase 1 experience. Surfacing it in a touch-friendly location on mobile ensures feature parity and prevents users from being locked out of property editing on small screens.

**Independent Test**: Can be fully tested by selecting a text object in the mobile editor and confirming the bottom contextual toolbar appears with at minimum font size controls and a delete button, and that those controls modify the selected object.

**Acceptance Scenarios**:

1. **Given** the mobile editor is open with canvas objects visible, **When** the user taps a text object, **Then** a contextual toolbar appears at the bottom of the screen above the tab bar, showing relevant controls (font size, color, delete).
2. **Given** the contextual toolbar is visible, **When** the user taps the delete button, **Then** the selected object is removed from the canvas and the toolbar disappears.
3. **Given** an object is selected, **When** the user taps elsewhere on the canvas (deselects), **Then** the contextual toolbar disappears.

---

### User Story 4 - Access Face Preview on Mobile (Priority: P4)

On mobile, the mini Front/Back preview column is hidden to maximize canvas space. A user who wants to see both faces of the tag taps a "Preview" button in the mobile topbar. An overlay appears showing both face thumbnails, and the user can tap a face thumbnail to switch the active face on the canvas.

**Why this priority**: Face switching is important for double-sided tags, but it is a secondary action that can live behind a single tap. Hiding the preview column is necessary on mobile to preserve canvas real estate.

**Independent Test**: Can be fully tested by opening the editor on a mobile viewport, tapping the topbar preview button, confirming both face thumbnails appear, and tapping one to switch the active canvas face.

**Acceptance Scenarios**:

1. **Given** the mobile editor is open, **When** the view loads, **Then** the mini Front/Back preview column is not visible and no horizontal space is reserved for it.
2. **Given** the mobile editor is open, **When** the user taps the preview icon in the topbar, **Then** an overlay appears showing both face thumbnails (Front and Back).
3. **Given** the preview overlay is open, **When** the user taps a face thumbnail, **Then** the overlay closes and the canvas switches to display the selected face.

---

### Edge Cases

- What happens when the user rotates the device from portrait to landscape? The layout must adapt without losing unsaved canvas changes.
- What happens when the bottom sheet is dragged fully open (to 90% height) and the on-screen keyboard appears? The sheet must not obscure the active input field — the visible area should scroll to keep the focused input in view.
- How does the system handle a template with more than 5 tool types in the mobile tab bar? Only the 5 highest-priority tools (Edit, Text, Image, Elements, Layers) are shown directly; remaining tools (Background, Icons) are accessible via an overflow "More" entry.
- What happens when a user tries to drag-and-drop layers in the Layers panel on a touch device? The drag-and-drop interaction must respond to touch events equivalently to mouse drag events.
- How does the contextual toolbar behave if the selected object is positioned at the very bottom of the canvas, close to the tab bar? The toolbar must remain fully visible and must not overlap the tab bar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The editor MUST display a full-width canvas with no left sidebar or right preview column when the viewport is narrower than 768px.
- **FR-002**: The editor MUST display a bottom tab bar with up to 5 tool tabs on viewports narrower than 768px; remaining tools MUST be accessible via an overflow entry in the tab bar.
- **FR-003**: The editor MUST display a compact icon-only sidebar (no text labels) and open panels as overlays on viewports between 768px and 1023px.
- **FR-004**: The editor MUST display the full desktop 4-column layout (sidebar + panel + canvas + preview) on viewports 1024px and wider, preserving all Phase 1 desktop behaviour.
- **FR-005**: On mobile, tapping a tool tab MUST open the corresponding panel as a bottom sheet; the sheet MUST open to approximately 50% of the viewport height by default.
- **FR-006**: The bottom sheet MUST support drag gestures — upward to a maximum of 90% of the viewport height, and downward to dismiss.
- **FR-007**: On mobile, the mini Front/Back preview column MUST be hidden; a preview button in the topbar MUST open an overlay showing both face thumbnails.
- **FR-008**: Tapping a face thumbnail in the preview overlay MUST switch the active canvas face and close the overlay.
- **FR-009**: The mobile topbar MUST contain only: an exit/back button, the template title, an overflow menu (⋯), and a save button. Undo and Redo MUST be accessible inside the overflow menu.
- **FR-010**: When a canvas object is selected in mobile view, a contextual toolbar MUST appear at the bottom of the screen above the tab bar, displaying the same property controls as the desktop floating toolbar (scoped to the object type: text, image, or shape).
- **FR-011**: The contextual toolbar MUST disappear when the user deselects the canvas object.
- **FR-012**: All 7 tool panels from Phase 1 (Personalize, Add Text, Add Image, Background, Elements, Icons, Layers) MUST remain accessible on mobile via the bottom tab bar and bottom sheet.
- **FR-013**: The editor layout MUST adapt without data loss when the user rotates the device between portrait and landscape orientations.
- **FR-014**: The Layers panel drag-and-drop reordering MUST work correctly on touch devices.
- **FR-015**: All interactive touch targets (tab bar buttons, bottom sheet drag handle, toolbar buttons) MUST be at least 44×44px to meet touch-accessibility standards.

### Key Entities

- **Viewport Breakpoint**: A screen-width threshold that determines which layout variant is rendered (mobile < 768px, tablet 768–1023px, desktop ≥ 1024px).
- **Bottom Tab Bar**: The mobile replacement for the desktop left sidebar — a horizontal row of up to 5 tool icons fixed at the bottom of the screen.
- **Bottom Sheet**: The mobile replacement for the desktop side panel — a vertically sliding overlay anchored to the bottom of the screen, draggable between 50% and 90% of viewport height, and dismissible by dragging down.
- **Mobile Topbar**: A simplified version of the desktop topbar containing only exit, title, overflow menu, and save actions.
- **Preview Overlay**: A modal that shows Front and Back face thumbnails on mobile, replacing the always-visible mini preview column.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user on a 375px-wide mobile viewport can complete the full "Personalize → Apply → Save" workflow without horizontal scrolling or unintended zoom.
- **SC-002**: Switching between tool panels via the bottom tab bar takes no more than one tap, with the bottom sheet fully open within 300ms of the tap.
- **SC-003**: All 7 tool panels available on desktop are reachable on mobile in no more than 2 taps from the main editor view.
- **SC-004**: Rotating the device from portrait to landscape (or vice versa) preserves all unsaved canvas edits with no data loss.
- **SC-005**: The contextual bottom toolbar appears within 200ms of an object being selected on the mobile canvas.
- **SC-006**: The editor is fully functional and visually correct across all three breakpoints (mobile, tablet, desktop) without requiring a page reload when the viewport is resized.
- **SC-007**: Task completion rate for "personalize and save a tag design" on mobile is within 10 percentage points of the equivalent rate on desktop.

## Assumptions

- The Phase 1 desktop editor (`002-editor-phase1-desktop`) is fully implemented and stable before Phase 2 work begins; Phase 2 adapts existing Phase 1 components rather than rebuilding them.
- Breakpoints are defined as: mobile < 768px, tablet 768–1023px, desktop ≥ 1024px — matching the values documented in the EDITOR_REDESIGN_PLAN.
- The bottom tab bar on mobile shows a maximum of 5 tools by default; the priority set is Edit, Text, Image, Elements, Layers — with Background and Icons accessible via an overflow entry.
- Touch drag interactions for the Layers panel and the bottom sheet are handled by the same Angular CDK DragDrop module already used for the desktop implementation.
- The mobile topbar omits Undo/Redo from the primary bar; these remain available via the overflow menu.
- The preview overlay on mobile uses the same face-thumbnail rendering already present in the desktop `PagesSelectorComponent` (face switcher), reused inside the overlay.
- No new backend services are required for Phase 2 — all changes are layout and interaction adaptations of existing Phase 1 components and services.
- Accessibility requirements (WCAG 2.1 AA) from Phase 1 carry over to Phase 2; the 44×44px minimum touch target rule is the mobile-specific addition.
- "Upload from your phone" (mobile QR code upload) mentioned in the Phase 1 image panel plan is explicitly deferred — it is not part of Phase 2 scope.
