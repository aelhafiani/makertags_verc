import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // ── Client-only (auth-protected or canvas-heavy) ─────────────────────────
  { path: 'creator/**',         renderMode: RenderMode.Client },
  { path: 'dashboard/**',       renderMode: RenderMode.Client },
  { path: 'auth/**',            renderMode: RenderMode.Client },
  { path: 'profile',            renderMode: RenderMode.Client },
  { path: 'profile/**',         renderMode: RenderMode.Client },
  { path: 'purchase-success',   renderMode: RenderMode.Client },

  // ── SSR public pages (SEO-critical, data fetched on each request) ─────────
  { path: '',                   renderMode: RenderMode.Server },
  { path: 'tags',               renderMode: RenderMode.Server },
  { path: 'detail/:id',         renderMode: RenderMode.Server },
  { path: 'public-art/:slug',   renderMode: RenderMode.Server },

  // ── Wildcard fallback ─────────────────────────────────────────────────────
  // Must be LAST — catches all remaining routes (category pages, static pages)
  { path: '**',                 renderMode: RenderMode.Server },
];
