# Contract: Iconify Adapter Service

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12
**Source target**: `src/app/modules/author/services/iconify-adapter.service.ts` (new)
**Spec references**: FR-031, FR-032, FR-033, FR-033a, research.md §4, data-model.md `IconifySearchResult`

---

## Overview

`IconifyAdapterService` wraps the public Iconify HTTP API (`api.iconify.design`) for the Icons panel. It provides keyword search and lazy SVG retrieval, with an in-memory session cache so repeat queries and repeat icon picks are free.

No SDK, no API key, no authentication. Iconify's public endpoints are open for reasonable client use.

---

## Public API

```typescript
@Injectable({ providedIn: 'root' })
class IconifyAdapterService {
  /** Search icons by keyword. Returns up to `limit` results (default 60). */
  search(query: string, limit?: number): Promise<IconifySearchResult[]>;

  /** Fetch the SVG source for a specific icon, optionally with a fill color
   *  applied server-side by Iconify. Results are cached per (id, color). */
  fetchSvg(id: string, color?: string): Promise<string>;

  /** Clear the in-memory cache. Called on editor shell destroy. */
  clearCache(): void;
}

interface IconifySearchResult {
  id: string;         // `${prefix}:${name}`
  prefix: string;
  name: string;
  svg: string | null; // null until fetchSvg() is called
}
```

---

## HTTP endpoints

### Search

```
GET https://api.iconify.design/search?query={encodedQuery}&limit={limit}
```

Response shape (truncated):

```json
{
  "icons": ["mdi:heart", "mdi:heart-outline", "bi:heart", "lucide:heart", ...],
  "total": 312,
  "limit": 60,
  "start": 0,
  "collections": { ... }
}
```

The adapter maps `icons[]` → `IconifySearchResult[]` with `svg: null`.

### Single-icon SVG

```
GET https://api.iconify.design/{prefix}/{name}.svg?color={hexWithoutHash}
```

Returns `Content-Type: image/svg+xml` with the raw SVG string. When `color` is omitted, Iconify uses the icon's default fill (usually `currentColor`).

---

## Caching strategy

```typescript
private searchCache = new Map<string, IconifySearchResult[]>();
// key: `${query}:${limit}` — lowercased and trimmed

private svgCache = new Map<string, string>();
// key: `${id}:${color ?? ''}`

async search(query: string, limit = 60): Promise<IconifySearchResult[]> {
  const key = `${query.trim().toLowerCase()}:${limit}`;
  if (this.searchCache.has(key)) {
    return this.searchCache.get(key)!;
  }
  const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new IconifyNetworkError(res.status);
  const data = await res.json();
  const results: IconifySearchResult[] = data.icons.map((id: string) => {
    const [prefix, name] = id.split(':');
    return { id, prefix, name, svg: null };
  });
  this.searchCache.set(key, results);
  return results;
}

async fetchSvg(id: string, color?: string): Promise<string> {
  const key = `${id}:${color ?? ''}`;
  if (this.svgCache.has(key)) return this.svgCache.get(key)!;

  const [prefix, name] = id.split(':');
  const colorParam = color ? `?color=${color.replace('#', '')}` : '';
  const res = await fetch(`https://api.iconify.design/${prefix}/${name}.svg${colorParam}`);
  if (!res.ok) throw new IconifyNetworkError(res.status);
  const svg = await res.text();
  this.svgCache.set(key, svg);
  return svg;
}
```

Cache is cleared by `clearCache()` on `EditorShellComponent.ngOnDestroy` (session-scoped, per clarification Q4).

---

## Placing an icon on the canvas

The Icons panel uses Fabric.js `loadSVGFromString`:

```typescript
import { loadSVGFromString, util, Group } from 'fabric';

async placeIcon(id: string, color: string): Promise<void> {
  const svgText = await this.iconify.fetchSvg(id, color);
  const { objects, options } = await loadSVGFromString(svgText);
  const group = util.groupSVGElements(objects, options) as Group;
  group.set({
    left: canvas.getWidth() / 2 - group.width! / 2,
    top: canvas.getHeight() / 2 - group.height! / 2,
  });
  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.requestRenderAll();
}
```

The placed Fabric.js `Group` carries the SVG's path structure so future color changes (via the floating toolbar `fill` control) can re-apply to child paths.

---

## Error handling

```typescript
class IconifyNetworkError extends Error {
  constructor(public status: number) {
    super(
      status === 0
        ? 'Cannot reach the icon library. Check your connection.'
        : `Icon library responded with ${status}.`
    );
  }
}
```

The Icons panel surfaces errors via `NzMessageService` and keeps the panel usable (no fatal overlay).

---

## Rate considerations

- Iconify's public tier is generous and not rate-limited for non-abusive clients at the expected volume (a handful of searches per editor session).
- The session cache means a user who searches "heart" twice pays for one network call.
- No server-side proxy needed.

---

## Failure modes

| Condition | Behavior |
|---|---|
| Network unreachable | Throws `IconifyNetworkError(0)`; panel shows error state |
| 404 on SVG fetch | Throws `IconifyNetworkError(404)`; panel shows "Icon not found" |
| Malformed SVG from server | Fabric.js `loadSVGFromString` fails; caught and surfaced as a user error |
| Empty search | Returns `[]`; panel shows empty state |

---

## Testing contract

- Unit tests with `fetch` mocked via `HttpTestingController` or a `fetch` spy.
- Verify cache hits avoid a second network call.
- Verify error paths surface `IconifyNetworkError` with the correct status.
- No live Iconify call in the automated suite; a manual quickstart smoke test covers it.
