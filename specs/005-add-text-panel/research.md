# Research: Add Text Panel

**Branch**: `005-add-text-panel` | **Date**: 2026-04-13

## Summary

No external research required. All architectural decisions are derivable from the existing codebase, specifically from `EditPanelComponent` (the direct structural precedent). Five decisions were made during Phase 0 and are documented in [plan.md](./plan.md).

## Key Findings

| # | Topic | Decision | Source |
|---|-------|----------|--------|
| 1 | List building | Reuse `buildFieldsFromCanvas()` from `edit-panel.types.ts` | Existing code |
| 2 | Dynamic updates | Canvas `object:added` / `object:removed` events subscribed in component | Fabric.js 6 event API |
| 3 | Canvas→panel sync | `CanvasProviderService.activeObject$` stream | Existing service |
| 4 | New text object type | `Textbox` (word-wrap; consistent with templates) | Fabric.js 6 docs |
| 5 | History snapshot | On input blur (not per-keystroke) | `EditPanelComponent` pattern |

## No Unresolved Clarifications

All NEEDS CLARIFICATION items from the spec were resolved with informed defaults:

- Default text object properties: `fontSize: 32`, `fontFamily: 'Inter'`, `fill: '#000000'`, `textAlign: 'center'`, `width: 200` — reasonable starting point, designer adjusts via floating toolbar
- Debounce period: 80 ms — same as `EditPanelComponent`
- Empty state: show empty list (no message) — specified in FR-009
