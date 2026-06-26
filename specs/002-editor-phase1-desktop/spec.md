# Feature Specification: Editor Phase 1 — Desktop Redesign

**Feature Branch**: `002-editor-phase1-desktop`  
**Created**: 2026-04-11  
**Updated**: 2026-04-12  
**Status**: Draft

---

## Clarifications

### Session 2026-04-12

- Q: Which canvas actions must the undo/redo history stack cover? → A: Full coverage — create/delete + text content edits + position/rotate/scale + style property changes (font, color, fill, border) + visibility/lock toggles
- Q: How should user-uploaded images be stored and persisted? → A: Persistent via Supabase Storage — upload on drop, store returned URL on the Fabric.js Image object, saved design references the URL so images survive across sessions
- Q: What accessibility baseline must the redesigned editor meet? → A: WCAG 2.1 AA — full keyboard navigation for panels and floating toolbar, ARIA labels, visible focus indicators, 4.5:1 contrast, screen-reader-announced state changes
- Q: Which icon library powers the Icons panel? → A: Iconify API — on-demand fetch from api.iconify.design with in-session caching
- Q: What file type and size constraints apply to user image uploads? → A: JPEG, PNG, WebP, SVG up to 10 MB; non-blocking warning above 4000×4000 dimensions

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Personalize Template Text Fields (Priority: P1)

A user opens a tag template in the editor and wants to customize the printed text (e.g., recipient name, event title, subtitle) without having to click directly on canvas objects. They open the "Edit" panel, see a clearly labeled form auto-generated from the IText and Textbox objects already present on the Fabric.js canvas, type their custom text into each field, click "Apply changes," and see the canvas update instantly.

**Why this priority**: This is the single most important new feature of the redesign — the "Personalize your design" panel. It directly enables end-user self-service customization and is the primary reason users visit the editor. Without it, users cannot efficiently personalize their tags.

**How it works**: On template load, the Edit panel scans the Fabric.js canvas for all objects of type `i-text` and `textbox`. Each one generates a labeled input in the panel. The label displayed is derived from the object's current text content (first ~20 characters). When the user clicks "Apply changes," each input value is written back to its corresponding Fabric.js object via `fabricObject.set('text', newValue)` followed by `canvas.renderAll()`. No external schema or configuration file is required.

**Independent Test**: Can be fully tested by loading any template that contains IText or Textbox objects on the canvas and verifying that form inputs drive canvas text updates — independently of the full layout redesign being complete.

**Acceptance Scenarios**:

1. **Given** a template with 3 IText/Textbox objects on the canvas is loaded, **When** the user opens the "Edit" panel, **Then** 3 labeled input fields appear, each pre-filled with the current text of its corresponding canvas object.
2. **Given** the Edit panel is open, **When** the user types a new value in a field and clicks "Apply changes," **Then** the corresponding Fabric.js text object on the canvas updates to reflect the new value.
3. **Given** a canvas object is of type `textbox` (multi-line), **When** it appears in the Edit panel, **Then** it is rendered as a textarea (not a single-line input).
4. **Given** a canvas object is of type `i-text` (single-line), **When** it appears in the Edit panel, **Then** it is rendered as a single-line text input.
5. **Given** the template canvas has no IText or Textbox objects, **When** the Edit panel is opened, **Then** an empty state message is shown (not a blank form).

---

### User Story 2 - Navigate Tools via Left Sidebar (Priority: P2)

A user needs to switch between editor tools (Edit, Add Text, Add Image, Background, Elements, Icons, Layers). Instead of bottom tabs, they use a vertical icon sidebar on the left. Clicking a tool icon opens the corresponding contextual panel; clicking a second tool closes the first panel and opens the new one.

**Why this priority**: The sidebar is the primary navigation hub. All panels depend on it. It must exist before any other panel can be meaningfully used.

**Independent Test**: Can be fully tested with placeholder panels — verify sidebar navigation, active states, and single-panel-open behavior in isolation.

**Acceptance Scenarios**:

1. **Given** the editor is open, **When** the user views the left edge, **Then** they see 7 vertically arranged tool icons with labels: Edit, Add Text, Add Image, Background, Elements, Icons, Layers.
2. **Given** no tool is active, **When** the user clicks the "Edit" icon, **Then** the Edit panel slides in with a smooth animation and the icon is highlighted as active.
3. **Given** the Edit panel is open, **When** the user clicks "Add Text," **Then** the Edit panel closes and the Text panel opens — only one panel is visible at a time.
4. **Given** a panel is open, **When** the user clicks the currently active sidebar icon again, **Then** the panel closes.
5. **Given** any panel is open, **When** the panel is visible, **Then** the canvas area remains fully visible and is never covered by the sidebar or panel.

---

### User Story 3 - Add & Style Free Text on Canvas (Priority: P3)

A user wants to add a custom text element beyond the text objects already in the template. They open the "Add Text" panel, click "Add a text box," type their text, and a new IText object is placed on the canvas. They can also choose from quick-style presets (Heading, Subheading, Body, Cursive) to apply typographic styles in one click.

**Why this priority**: Text addition extends what users can do beyond template defaults. It is a foundational editor capability that increases creative flexibility.

**Independent Test**: Can be tested end-to-end by adding a free text element via the panel, confirming it appears on the canvas as a new Fabric.js IText object, and verifying quick-style presets apply distinct typographic treatments.

**Acceptance Scenarios**:

1. **Given** the Text panel is open, **When** the user clicks "Add a text box," **Then** an inline prompt appears for them to enter their text.
2. **Given** the user types text and confirms, **When** the text is submitted, **Then** a new IText object appears on the canvas and the Edit panel reflects the new object in its list.
3. **Given** the Text panel is open, **When** the user clicks a quick style (e.g., "Heading"), **Then** a new IText object is added to the canvas with the corresponding typographic preset applied (font family, font size, weight).

---

### User Story 4 - Edit Selected Object via Floating Toolbar (Priority: P4)

When a user clicks on a text, image, or shape object on the canvas, a compact toolbar appears floating above the selected object. The toolbar offers relevant actions: for text — font size, font family, bold, italic, alignment, color, delete; for images — crop, replace, flip, delete; for shapes — fill color, border, opacity, delete.

**Why this priority**: The contextual toolbar dramatically reduces clicks needed for common style edits. It is critical for a professional editing experience.

**Independent Test**: Can be tested independently by selecting different object types on the canvas and verifying the correct toolbar appears with correct controls.

**Acceptance Scenarios**:

1. **Given** the canvas has objects, **When** the user clicks a text object (IText or Textbox), **Then** a floating toolbar appears above it with text-specific controls (font size, font family, bold, italic, alignment, color, delete).
2. **Given** the canvas has objects, **When** the user clicks an image object, **Then** a floating toolbar appears with image-specific controls (crop, replace, flip horizontal, flip vertical, delete).
3. **Given** a floating toolbar is visible, **When** the user clicks empty canvas space, **Then** the toolbar disappears.
4. **Given** the selected object is near the top of the canvas, **When** the toolbar would overflow the viewport, **Then** it repositions to appear below the object instead.
5. **Given** the toolbar is shown, **When** the user changes the font size, **Then** the Fabric.js object updates in real time via `fabricObject.set('fontSize', value)` + `canvas.renderAll()`.

---

### User Story 5 - Upload and Place Custom Images (Priority: P5)

A user wants to personalize their tag with a personal photo or logo. They open the "Add Image" panel, click "Upload from computer," select an image file, and the image is placed on the canvas as a new Fabric.js Image object. Previously uploaded images in the current session appear in a gallery for re-use.

**Why this priority**: Image upload enables personal branding and unique designs. It is a commonly expected editor feature that expands customization beyond text alone.

**Independent Test**: Can be tested by uploading an image file, confirming it appears on the canvas as a Fabric.js Image object, and verifying the session gallery shows previously uploaded images.

**Acceptance Scenarios**:

1. **Given** the Image panel is open, **When** the user clicks "Upload from computer" and selects an image file, **Then** the image is placed on the canvas as a Fabric.js Image object.
2. **Given** the user has uploaded at least one image in the current session, **When** they open the Image panel, **Then** a "Recent uploads" section shows thumbnails of previously uploaded images.
3. **Given** the gallery is visible, **When** the user clicks a thumbnail, **Then** that image is placed on the canvas.

---

### User Story 6 - Change Canvas Background Color or Image (Priority: P6)

A user wants to change the background of their tag design. They open the "Background" panel, pick a color from the swatch palette, recent colors, or a custom hex value, and see the canvas background update instantly via `canvas.setBackgroundColor()`. Alternatively, they upload a background image via `canvas.setBackgroundImage()`.

**Why this priority**: Background customization is a standard design-tool expectation that directly affects the visual output.

**Independent Test**: Can be tested by selecting a color from the swatch grid and verifying the canvas background updates.

**Acceptance Scenarios**:

1. **Given** the Background panel is open, **When** the user clicks a color swatch, **Then** the canvas background updates to that color immediately.
2. **Given** the Background panel is open, **When** the user enters a valid hex value in the custom input, **Then** the canvas background updates to that color.
3. **Given** a background color is set, **When** the user clicks "Remove," **Then** the background reverts to transparent or the template default.
4. **Given** the Background panel is open, **When** the user uploads an image, **Then** the image is set as the canvas background via `canvas.setBackgroundImage()`.

---

### User Story 7 - Add Decorative Shapes and Elements (Priority: P7)

A user wants to add geometric shapes or decorative graphics to their design. They open the "Elements" panel, choose from basic dynamic shapes (square, rounded rectangle, circle, triangle) or browse a graphics grid, and click to place the element on the canvas as a new Fabric.js object.

**Why this priority**: Elements enrich designs and are a standard creative-tool feature, placed after core text and image workflows.

**Independent Test**: Can be tested by clicking a shape button and verifying the corresponding Fabric.js shape object is added to the canvas.

**Acceptance Scenarios**:

1. **Given** the Elements panel is open, **When** the user clicks a dynamic shape (e.g., circle), **Then** a Fabric.js Circle object is added to the canvas in a default centered position.
2. **Given** the Elements panel is open, **When** the user clicks a graphic thumbnail, **Then** the graphic is placed on the canvas as a Fabric.js SVG or Image object.
3. **Given** the Elements panel is open, **When** the user types in the search bar, **Then** the element grid filters to show matching results.

---

### User Story 8 - Search and Place SVG Icons (Priority: P8)

A user wants to add an icon (e.g., heart, star, envelope) to their design. They open the "Icons" panel, search by keyword, browse results in a grid, choose a color, and click an icon to place it on the canvas as a Fabric.js SVG object.

**Why this priority**: Icons add polish to tag designs. Depends on the sidebar and canvas integration being stable.

**Independent Test**: Can be tested by searching for a keyword, selecting an icon, and verifying it appears on the canvas as a colored Fabric.js SVG object.

**Acceptance Scenarios**:

1. **Given** the Icons panel is open, **When** the user types "heart" in the search bar, **Then** heart-related SVG icons appear in the grid.
2. **Given** icons are displayed, **When** the user selects a color and clicks an icon, **Then** the icon is placed on the canvas as a Fabric.js SVG object with the selected color applied.
3. **Given** the icons panel is loading results, **When** results are not yet available, **Then** a loading indicator is shown.

---

### User Story 9 - Manage Canvas Layers (Priority: P9)

A user wants to see all Fabric.js canvas objects listed as layers, reorder them, and control visibility and lock state. They open the "Layers" panel, see a list ordered front-to-back (derived from `canvas.getObjects()`), drag items to reorder them, and toggle visibility or lock per layer.

**Why this priority**: Layer management is essential for complex overlapping designs. It is the most technically involved panel and builds on all other canvas interactions.

**Independent Test**: Can be tested by placing multiple elements on the canvas, opening the Layers panel, and verifying the list matches stacking order returned by `canvas.getObjects()`, with drag-to-reorder calling `canvas.moveTo()` to update the canvas.

**Acceptance Scenarios**:

1. **Given** the canvas has 3 objects, **When** the user opens the Layers panel, **Then** 3 layer items are listed in stacking order (front-most first), matching `canvas.getObjects()` reversed.
2. **Given** the Layers panel is open, **When** the user drags a layer item to a new position, **Then** `canvas.moveTo()` is called and the canvas updates the object's render order accordingly.
3. **Given** a visible layer, **When** the user clicks its visibility icon, **Then** `fabricObject.set('visible', false)` is called, the object hides on the canvas, and the icon reflects the hidden state.
4. **Given** an unlocked layer, **When** the user clicks its lock icon, **Then** `lockMovementX` and `lockMovementY` are set to true on the Fabric.js object and it can no longer be moved on the canvas.
5. **Given** the Layers panel is open, **When** the user clicks a layer item, **Then** `canvas.setActiveObject()` is called and the corresponding canvas object is selected.

---

### User Story 10 - Redesigned Topbar Navigation (Priority: P10)

A user sees a clean redesigned topbar: "Save and Exit" on the left, template name and auto-save status in the center with Design/Options/Review step tabs and Undo/Redo controls, and a Preview button with a "Next" CTA on the right.

**Why this priority**: The topbar is always visible and frames the editing experience. Lower priority since the current topbar remains functional during transition.

**Independent Test**: Can be fully tested visually — verify all elements render, undo/redo respond to canvas actions, and save status updates after making a change.

**Acceptance Scenarios**:

1. **Given** the editor is open, **When** the user views the topbar, **Then** they see: Save and Exit (left), template title + save status indicator + Design/Options/Review tabs + Undo/Redo (center), Preview + Next CTA (right).
2. **Given** the user has made a change, **When** the change is auto-saved, **Then** the save status indicator changes from "Saving…" to "Saved."
3. **Given** the user performed a canvas action, **When** they click Undo, **Then** the last action is reversed on the canvas.

---

### Edge Cases

- What happens when the canvas has no IText or Textbox objects? The Edit panel shows an empty state message: "This template has no editable text fields."
- What happens when a user uploads a file that is not a valid image? Non-image MIME types and unsupported image formats (anything other than JPEG, PNG, WebP, SVG) are rejected with a clear, user-friendly error message listing the accepted formats. Files larger than 10 MB are rejected with a size-limit error. Files whose dimensions exceed 4000×4000 pixels are accepted but trigger a non-blocking performance warning.
- What happens when the user selects multiple canvas objects at once? The floating toolbar does not appear (or shows only universal actions: delete, duplicate).
- What happens when a text object's current text is empty? The input in the Edit panel appears empty but remains editable, with a placeholder label derived from the object's index (e.g., "Text field 1").
- What happens when the contextual toolbar would overflow the right or left edge of the canvas? It repositions to remain within visible canvas bounds.
- What happens when the browser window is resized below 1024px? The layout may degrade gracefully — full mobile responsiveness is deferred to Phase 2.
- What happens when a new IText is added via the "Add Text" panel? The Edit panel refreshes its list to include the new object on next open.

---

## Requirements *(mandatory)*

### Functional Requirements

**Layout & Navigation**

- **FR-001**: System MUST replace the current bottom-tab layout with a four-zone desktop layout: left sidebar (72px), contextual panel (260px), canvas (flexible), and mini-preview column (140px).
- **FR-002**: System MUST display a persistent vertical sidebar with 7 tool icons always visible on the left edge.
- **FR-003**: System MUST ensure only one contextual panel is open at any given time.
- **FR-004**: System MUST animate panel open and close with a slide transition of approximately 260ms.
- **FR-005**: System MUST keep the canvas and mini-preview column always visible, regardless of which panel is open.
- **FR-006**: System MUST open the Edit panel by default when a template is first loaded.

**Edit / Personalize Panel**

- **FR-007**: System MUST scan the Fabric.js canvas on template load and auto-generate one form input per IText or Textbox object found via `canvas.getObjects()`.
- **FR-008**: System MUST pre-fill each generated form input with the current `text` property of its corresponding Fabric.js object.
- **FR-009**: System MUST render Textbox objects (multi-line) as textareas and IText objects (single-line) as single-line text inputs.
- **FR-010**: System MUST use the first ~20 characters of the object's current text as the input label. If the text is empty, the label falls back to "Text field {index}".
- **FR-011**: System MUST apply all user edits to the canvas when the user clicks "Apply changes" by calling `fabricObject.set('text', newValue)` and `canvas.renderAll()` for each modified field.
- **FR-012**: System MUST display a clear empty-state message in the Edit panel when the canvas contains no IText or Textbox objects.

**Floating Contextual Toolbar**

- **FR-013**: System MUST display a floating toolbar above a canvas object when the user selects it via Fabric.js `selection:created` or `selection:updated` events.
- **FR-014**: System MUST show context-appropriate controls based on Fabric.js object type: IText/Textbox (font size, font family, bold, italic, alignment, color, delete), Image (crop, replace, flip H, flip V, delete), shape (fill color, border, opacity, delete).
- **FR-015**: System MUST hide the toolbar when the user deselects the object via Fabric.js `selection:cleared` event.
- **FR-016**: System MUST reposition the toolbar below the selected object if there is insufficient space above it within the canvas viewport.
- **FR-017**: System MUST apply toolbar style changes to the canvas object in real time via the appropriate `fabricObject.set()` call followed by `canvas.renderAll()`.

**Topbar**

- **FR-018**: System MUST display a redesigned topbar containing: Save and Exit (left), template title + save status + Design/Options/Review tabs + Undo/Redo controls (center), Preview button + Next CTA (right).
- **FR-019**: System MUST reflect the current auto-save state (Saving… / Saved) via a visual indicator in the topbar.
- **FR-020**: System MUST support undo and redo via topbar buttons for the following canvas action categories: (a) object create/delete, (b) text content edits on IText/Textbox, (c) position, rotation, and scale transforms, (d) style property changes (font family, font size, font weight, fill/color, stroke/border, opacity), and (e) visibility and lock toggles on layers.

**Panel: Add Text**

- **FR-021**: System MUST allow users to add a new IText object to the canvas via a text input prompt in the Text panel.
- **FR-022**: System MUST provide at least 3 quick-style text presets in the Text panel that create styled IText objects on the canvas with distinct font family, size, and weight combinations.

**Panel: Add Image**

- **FR-023**: System MUST allow users to upload an image from their local device, persist the file to Supabase Storage, and place it on the canvas as a Fabric.js Image object via `fabric.Image.fromURL()` using the returned public URL. The Fabric.js Image object MUST reference the Supabase Storage URL (not an embedded base64 data URL) so that the saved design can be reopened with its user images intact across sessions.
- **FR-023a**: System MUST accept only the following image MIME types for upload: `image/jpeg`, `image/png`, `image/webp`, and `image/svg+xml`. Files of any other type MUST be rejected with a user-friendly error message identifying the accepted formats.
- **FR-023b**: System MUST reject uploaded image files whose size exceeds 10 MB with a user-friendly error message stating the limit.
- **FR-023c**: System MUST display a non-blocking warning to the user when an accepted image's intrinsic dimensions exceed 4000×4000 pixels, advising that large images may impact editor performance, while still allowing the upload to proceed.
- **FR-024**: System MUST display a gallery of the user's previously uploaded images, sourced from Supabase Storage, for re-use. Gallery entries MUST survive page reloads and return visits within the same user account.

**Panel: Background**

- **FR-025**: System MUST allow users to set the canvas background to a solid color via `canvas.setBackgroundColor()`, from a swatch palette, recent colors list, or custom hex input.
- **FR-026**: System MUST allow users to upload an image as the canvas background via `canvas.setBackgroundImage()`.
- **FR-027**: System MUST allow users to remove the current background by calling `canvas.setBackgroundColor(null)` or `canvas.setBackgroundImage(null)`.

**Panel: Elements**

- **FR-028**: System MUST allow users to add basic Fabric.js shapes (Rect, Rect with rx/ry, Circle, Triangle) to the canvas.
- **FR-029**: System MUST display a browsable grid of graphic elements (SVG assets) that can be placed on the canvas.
- **FR-030**: System MUST provide a search bar that filters displayed elements.

**Panel: Icons**

- **FR-031**: System MUST provide a searchable icon library powered by the Iconify API (`api.iconify.design`). The panel MUST query Iconify's search endpoint for keyword input and display the returned SVG icons in a grid.
- **FR-032**: System MUST allow users to select a color before placing an icon, applied to the Fabric.js SVG object on placement (via fill/stroke on the Iconify-sourced SVG).
- **FR-033**: System MUST display a loading indicator while icon search results are being fetched from the Iconify API, and MUST surface a user-friendly error message when the API is unreachable.
- **FR-033a**: System MUST cache fetched Iconify search results and icon SVGs in memory for the duration of the editor session to avoid redundant network requests for repeat queries.

**Panel: Layers**

- **FR-034**: System MUST list all Fabric.js canvas objects as layers, ordered front-to-back by reversing the `canvas.getObjects()` array (index 0 = back).
- **FR-035**: System MUST allow users to reorder layers via drag-and-drop, calling `canvas.moveTo(object, newIndex)` to update the canvas stacking order immediately.
- **FR-036**: System MUST allow users to toggle visibility of individual layers via `fabricObject.set('visible', boolean)` + `canvas.renderAll()`.
- **FR-037**: System MUST allow users to lock individual layers by setting `lockMovementX`, `lockMovementY`, `lockScalingX`, `lockScalingY` to true on the Fabric.js object.
- **FR-038**: System MUST select the corresponding canvas object via `canvas.setActiveObject()` when the user clicks its entry in the Layers panel.
- **FR-039**: System MUST NOT show the floating contextual toolbar when multiple canvas objects are selected simultaneously. Only universal actions (delete) may be shown in this state.

**Accessibility**

- **FR-040**: System MUST meet WCAG 2.1 Level AA across the redesigned editor surfaces (sidebar, contextual panels, floating toolbar, topbar). Canvas drawing surfaces are exempt from visual-content contrast rules but all surrounding chrome and controls are in scope.
- **FR-041**: System MUST be fully operable via keyboard alone: every sidebar tool, panel control, floating toolbar control, topbar control, and layer item MUST be reachable via Tab/Shift+Tab and activatable via Enter or Space.
- **FR-042**: System MUST expose ARIA labels or accessible names on every interactive control so that screen readers announce its purpose, and MUST announce state changes such as "panel opened," "object selected," and "save status: saving/saved" via appropriate ARIA live regions or role updates.
- **FR-043**: System MUST render a visible focus indicator on all focusable elements, and MUST maintain a 4.5:1 minimum contrast ratio for all text and meaningful UI elements in the chrome.

### Key Entities

- **Template**: A design artifact loaded onto a Fabric.js canvas. Contains a set of objects — decorative shapes/images and editable text objects (IText, Textbox). May have a front and optionally a back face.
- **Editable Text Object**: A Fabric.js `IText` (single-line) or `Textbox` (multi-line) object present on the canvas. Its `text` property holds the current display value. It is the sole source of truth for the Edit panel form.
- **Canvas Object**: Any Fabric.js object on the canvas — IText, Textbox, Image, Rect, Circle, Triangle, SVG group, or other. Has position, dimensions, style, `visible`, and lock state properties.
- **Layer**: A UI representation of a canvas object in the Layers panel, derived from `canvas.getObjects()`. Displays type indicator, a preview of the object name/content, visibility toggle, and lock toggle.
- **Tool / Panel**: One of 7 editor modes accessible from the sidebar (Edit, Add Text, Add Image, Background, Elements, Icons, Layers). Only one is active at a time.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open the Edit panel and apply text personalization to all canvas text objects within 60 seconds of opening a template for the first time.
- **SC-002**: Switching between any two tool panels completes in under 400ms (including animation) on a standard desktop.
- **SC-003**: The canvas is always visible and never covered during any panel interaction on screens ≥1024px wide.
- **SC-004**: 100% of IText and Textbox objects on the canvas appear as correctly labeled form inputs in the Edit panel — no objects are missing.
- **SC-005**: Applying changes from the Edit panel updates all modified canvas text objects without a page refresh.
- **SC-006**: The floating contextual toolbar appears within 200ms of selecting a canvas object.
- **SC-007**: Users can complete all 7 core actions (personalize text, add free text, upload image, change background, add shape, place icon, reorder layer) without leaving the editor view.
- **SC-008**: Layer drag-and-drop reordering updates the canvas render order correctly in 100% of tested cases.
- **SC-009**: The editor layout functions without horizontal scrolling on any desktop screen ≥1024px wide.
- **SC-010**: Undo and redo correctly reverse and re-apply the last canvas action across all tested interaction types.

---

## Assumptions

- The existing Fabric.js canvas integration and template loading are stable and functional — this redesign builds on top of them without replacing the canvas engine.
- Editable text fields are represented directly as `i-text` and `textbox` objects on the Fabric.js canvas. No external schema or configuration file is needed to identify them — the Edit panel discovers them at runtime via `canvas.getObjects()`.
- The label for each field in the Edit panel is derived from the object's current `text` property (first ~20 characters). If the text is empty, a fallback label ("Text field {index}") is used.
- Phase 1 targets desktop screens (≥1024px wide). Mobile responsiveness is explicitly deferred to Phase 2.
- The mini-preview panel (Front/Back thumbnails on the right column) is already functional and will be preserved as-is.
- The Iconify public API (`api.iconify.design`) is reachable from the deployment environment and does not require authentication for the endpoints used (search and SVG retrieval).
- A color picker component is available or can be integrated without a major dependency change.
- The drag-and-drop library used for layer reordering is already available as a project dependency (Angular CDK).
- The "Options" and "Review" step tabs in the topbar are visible placeholders in Phase 1 — they do not need to be fully functional.
- Auto-save is already wired to the canvas — the topbar save status indicator consumes that existing signal.
- Phone/QR-based image upload is out of scope for Phase 1 and deferred to Phase 2.