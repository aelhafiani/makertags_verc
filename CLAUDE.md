# CLAUDE.md — MakerTags Project Context

<!-- SPECKIT:AUTO-START — managed by /speckit.plan. Do not edit between these markers manually. -->
## Technology Stack (from active feature plans)

- **Language**: TypeScript — Angular 19.2.x (standalone components, Angular SSR enabled)
- **Canvas**: Fabric.js 6.6.1
- **State management**: NGXS 20.1 (`@ngxs/store`, `@ngxs/storage-plugin`)
- **UI library**: ng-zorro-antd 17.2 (Ant Design for Angular), Bootstrap 5.3.2
- **Backend**: Supabase (PostgreSQL via `@supabase/supabase-js 2.53`); Supabase Storage for file uploads
- **Reactive**: RxJS 7.8
- **Testing**: Karma/Jasmine (`ng test`)
- **Platform**: Web (PWA via `@angular/service-worker`; SSR via `@angular/ssr`)

## Active Feature Branches

| Branch | Spec | Status |
|---|---|---|
| `001-editor-current-state` | [spec](specs/001-editor-current-state/spec.md) | Audit (documentation only) |
| `002-editor-phase1-desktop` | [spec](specs/002-editor-phase1-desktop/spec.md) | Phase 1 design — plan complete (2026-04-12) |

## Recent Design Decisions (002-editor-phase1-desktop)

- **Undo/redo**: full-coverage JSON-snapshot history via `CanvasHistoryService` (LRU 100 per face)
- **User image upload**: Supabase Storage bucket `user-uploads`, per-user folder prefix, public read; `FabricImage.src` references the public URL (no base64)
- **Accessibility**: WCAG 2.1 AA — Angular CDK a11y + ng-zorro ARIA + custom overlay work for the floating toolbar
- **Icons**: Iconify public HTTP API (`api.iconify.design`) via `IconifyAdapterService`, in-memory session cache
- **Image constraints**: JPEG/PNG/WebP/SVG ≤ 10 MB; non-blocking warning above 4000×4000
- **New component tree**: `src/app/modules/author/components/shell/` (editor shell + sidebar + panels host + floating toolbar + topbar) and `components/panels/` (7 tool panels)
- **New services**: `canvas-history.service.ts`, `image-upload.service.ts`, `iconify-adapter.service.ts`, `editor-shell.state.ts` (NGXS sub-state), `floating-toolbar.controller.ts`
- **Preserved**: `fabric.Canvas`, `IArtDoc`/`IArtPage`, `ArtFacadeService`, `ArtDocsService`, `PagesSelectorComponent` (face switcher, wrapped by the new mini-preview column), `CanvasUtilsService` (hosts legacy property editors reused inside the floating toolbar)

<!-- SPECKIT:AUTO-END -->
