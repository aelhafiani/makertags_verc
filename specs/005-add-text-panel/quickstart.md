# Quickstart: Add Text Panel

**Branch**: `005-add-text-panel` | **Date**: 2026-04-13

## How to Verify This Feature Manually

### Prerequisites

- Dev server running: `ng serve`
- Browser open at the editor route (e.g. `http://localhost:4200/author/...`)

---

### Scenario 1 — Add a text box (P1, core flow)

1. Open the editor with any design (blank or existing).
2. Click the **Add Text** tool in the left sidebar.
3. Verify: the "Add text to your design" panel appears in the contextual panel lane.
4. Click the **"Add a text box"** button.
5. Verify: a text box labelled "New text" appears centred on the canvas and is selected (resize handles visible).
6. Verify: a new input row appears in the panel list, pre-filled with "New text".
7. Click the button again.
8. Verify: a second text box and input row appear; each is independent.

---

### Scenario 2 — Edit text from panel (P2)

1. With one or more text boxes on the canvas, open the Add Text panel.
2. Verify: each existing text object appears as an input, pre-filled with its current text.
3. Click on an input.
4. Verify: the corresponding canvas text object is selected.
5. Type new text (e.g. change "New text" to "Hello").
6. Verify: the canvas text updates in near-real-time (within one second of typing).
7. Click somewhere outside the input (blur).
8. Verify: undo (Ctrl+Z) reverts the text change — confirming a history snapshot was pushed.

---

### Scenario 3 — Canvas selection → panel highlight (P3)

1. With two or more text boxes on the canvas, open the Add Text panel.
2. Click one of the text boxes directly on the canvas.
3. Verify: the matching panel input gets a blue border highlight.
4. Click the other text box on the canvas.
5. Verify: the highlight moves to the new matching input.

---

### Scenario 4 — Object removed from canvas

1. With at least one text box on the canvas and the Add Text panel open.
2. Select the text box on the canvas and press `Delete`.
3. Verify: the corresponding panel input disappears immediately.
4. Verify: no stale rows remain and the panel shows an empty list if no text boxes are left.

---

### Scenario 5 — Empty canvas

1. Open the editor with a design that has no text objects.
2. Activate the Add Text panel.
3. Verify: the panel shows only the header and the "Add a text box" button — no empty-state message, no error.

---

## Notes

- Text styling (font, size, colour) is handled by the floating toolbar that appears when a text object is selected on the canvas — not by the Add Text panel.
- The panel list refreshes automatically when switching between canvas pages (faces); no manual refresh needed.
