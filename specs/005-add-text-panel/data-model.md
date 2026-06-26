# Data Model: Add Text Panel

**Branch**: `005-add-text-panel` | **Date**: 2026-04-13

## Entities

### TextItem (panel view model)

Represents one text object currently on the canvas, as displayed in the Add Text panel.

| Field | Type | Description |
|-------|------|-------------|
| `objectId` | `string` | Stable nanoid assigned to the Fabric object (`obj.id`). Used as the form control key and the highlight comparator. |
| `objectType` | `'i-text' \| 'textbox'` | The Fabric.js object type. Determines whether a single-line `<input>` or multi-line `<textarea>` is rendered. |
| `label` | `string` | Display label derived from the text content (first 20 chars) or a fallback like "Text field N". |
| `value` | `string` | Current text content of the canvas object. Kept in sync with the form control. |
| `indexOnCanvas` | `number` | Zero-based position of the object in `canvas.getObjects()`. Used for rendering order. |

**Source**: Reuses `EditablePanelField` from `src/app/modules/author/components/panels/edit-panel/edit-panel.types.ts`. No new type is required.

### PanelState (component state)

Runtime state held inside `AddTextPanelComponent`:

| Field | Type | Description |
|-------|------|-------------|
| `fields` | `EditablePanelField[]` | The current list of text items derived from the canvas. |
| `focusedObjectId` | `string \| null` | The `objectId` of the canvas-selected text object, used to apply the blue-border highlight to the matching input. |
| `canvas` | `Canvas \| null` | Reference to the active Fabric.js canvas instance, updated from `CanvasProviderService.canvas$`. |

## State Transitions

```
Panel opens
  └─► rebuildList() from canvas.getObjects()
        └─► fields[] populated

User clicks "Add a text box"
  └─► new Textbox added to canvas
        └─► object:added event fires
              └─► rebuildList()
                    └─► fields[] updated, new input appears

User focuses a panel input
  └─► canvas.setActiveObject(obj)
        └─► CanvasProviderService.setSelection()
              └─► activeObject$ emits
                    └─► focusedObjectId updated

User selects a text on canvas
  └─► activeObject$ emits
        └─► focusedObjectId = obj.id
              └─► matching input gets blue border

User deletes a text on canvas
  └─► object:removed event fires
        └─► rebuildList()
              └─► fields[] shrinks, input removed
```

## No Persistent Storage

The Add Text panel is purely a view-layer mirror of the Fabric.js canvas state. No data is written to Supabase or local storage by this feature.
