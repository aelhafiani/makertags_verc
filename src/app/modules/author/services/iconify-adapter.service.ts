import { Injectable } from '@angular/core';

export interface IconifySearchResult {
  id: string;
  prefix: string;
  name: string;
  svg: string | null;
}

export class IconifyNetworkError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 0
        ? 'Cannot reach the icon library. Check your connection.'
        : `Icon library responded with ${status}.`
    );
    this.name = 'IconifyNetworkError';
  }
}

@Injectable({ providedIn: 'root' })
export class IconifyAdapterService {
  private readonly searchCache = new Map<string, IconifySearchResult[]>();
  private readonly svgCache = new Map<string, string>();

  async search(query: string, limit = 60): Promise<IconifySearchResult[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const key = `${normalized}:${limit}`;
    if (this.searchCache.has(key)) {
      return this.searchCache.get(key) ?? [];
    }

    const response = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(normalized)}&limit=${limit}`
    );
    if (!response.ok) {
      throw new IconifyNetworkError(response.status);
    }

    const payload = (await response.json()) as { icons?: string[] };
    const results = (payload.icons ?? [])
      .filter((item) => item.includes(':'))
      .map((id) => {
        const [prefix, name] = id.split(':');
        return { id, prefix, name, svg: null };
      });

    this.searchCache.set(key, results);
    return results;
  }

  async fetchSvg(id: string, color?: string): Promise<string> {
    const key = `${id}:${color ?? ''}`;
    if (this.svgCache.has(key)) {
      return this.svgCache.get(key) ?? '';
    }

    const [prefix, name] = id.split(':');
    if (!prefix || !name) {
      throw new IconifyNetworkError(404);
    }

    const colorQuery = color ? `?color=${encodeURIComponent(color.replace('#', ''))}` : '';
    const response = await fetch(`https://api.iconify.design/${prefix}/${name}.svg${colorQuery}`);
    if (!response.ok) {
      throw new IconifyNetworkError(response.status);
    }

    const svg = await response.text();
    this.svgCache.set(key, svg);
    return svg;
  }

  clearCache(): void {
    this.searchCache.clear();
    this.svgCache.clear();
  }
}

