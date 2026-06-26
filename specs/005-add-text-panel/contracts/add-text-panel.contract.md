# Component Contract: AddTextPanelComponent

**Branch**: `005-add-text-panel` | **Date**: 2026-04-13

## Component Identity

| Property | Value |
|----------|-------|
| Selector | `maker-tags-add-text-panel` |
| File | `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts` |
| Standalone | `true` |
| Change Detection | `OnPush` |

## Inputs

None. The component is self-contained and pulls all state from injected services.

## Outputs

None. Side-effects are applied directly to the Fabric.js canvas via `CanvasProviderService`.

## Dependencies (injected)

| Service | Usage |
|---------|-------|
| `CanvasProviderService` | `canvas$` (initial canvas + list rebuild trigger), `activeObject$` (canvas→panel highlight) |
| `CanvasHistoryService` | `push('text:changed')` on input blur |
| `EditorAnnouncerService` | `announce()` for accessibility announcements on add/update |
| `ChangeDetectorRef` | `markForCheck()` after async canvas updates |

## Registration Contract

The component is registered in `ContextualPanelComponent`'s `TOOL_TO_COMPONENT` map:

```typescript
// src/app/modules/author/components/shell/contextual-panel/contextual-panel.component.ts
const TOOL_TO_COMPONENT: Partial<Record<ToolId, Type<unknown>>> = {
  edit: EditPanelComponent,
  'add-text': AddTextPanelComponent,   // ← this feature adds this entry
};
```

`AddTextPanelComponent` must also be added to the `imports` array of `ContextualPanelComponent`.

## Template Sections

| Section | Behaviour |
|---------|-----------|
| Panel header | Static title "Add text to your design" + subtitle "Add additional text to your design" |
| Text item list | `*ngFor` over `fields[]`; each row is an `<input>` bound via reactive form control; focused item gets `.focused` CSS class when `field.objectId === focusedObjectId` |
| Empty state | When `fields.length === 0`: render nothing (no message) |
| Add button | Full-width primary button; on click calls `addTextBox()` |

## Canvas Event Subscriptions (lifecycle)

| Event | Handler |
|-------|---------|
| `object:added` | `rebuildList()` |
| `object:removed` | `rebuildList()` |
| `object:modified` / `text:changed` | `syncValueFromCanvas(obj)` — updates the form control if the input does not have focus |

Subscriptions are established after `canvas$` emits a non-null canvas and are torn down on `ngOnDestroy()`.
