# Quickstart: Running the Editor Locally

**Branch**: `001-editor-current-state` | **Date**: 2026-04-11

---

## Prerequisites

- Node.js (check `.nvmrc` or `engines` field in `package.json` — not specified; use LTS)
- Yarn (lockfile is `yarn.lock`)

## Install

```bash
yarn install
```

## Run

```bash
yarn start
# or
ng serve
```

Default dev server: `http://localhost:4200`

## Access the Editor

The editor is mounted at the author route. Navigate to an art document by ID:

```
http://localhost:4200/author/{artDocId}
```

The `AuthorLayoutComponent` reads the `id` query/route param to load the art document from Supabase.

## Environment Variables

Supabase credentials and other env config are required. See `src/environments/` for the environment files. The app uses `ENVIRONMENTS` injection token (defined in `src/app/core/app.tokens.ts`).

## Build (production)

```bash
yarn build:prod
# or
ng build --configuration production
```

Output: `dist/makertags/`

## Tests

```bash
ng test
```

Runs Karma/Jasmine in watch mode. Spec files are co-located with components (`*.component.spec.ts`).

## Key Files for Editor Development

| File | Purpose |
|---|---|
| `src/app/modules/author/components/author/author.component.ts` | Root editor component — canvas lifecycle, events, save |
| `src/app/modules/author/components/author/author.component.html` | Editor template — topbar, canvas, bottom tabs, drawers |
| `src/app/modules/shared/domaine/entities/art.ts` | `IArtDoc` and `IArtPage` interfaces |
| `src/app/modules/shared/services/art-docs.service.ts` | Supabase CRUD for art documents |
| `src/app/modules/shared/services/new-art.facade.ts` | NGXS facade wrapping art document state |
| `src/app/modules/shared/canvas/canvas.utils.service.ts` | Canvas event bus |
| `src/app/modules/author/components/pages-selector/pages-selector.component.ts` | Front/back face switcher |
