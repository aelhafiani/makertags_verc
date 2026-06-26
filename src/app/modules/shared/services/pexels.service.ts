import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ENVIRONMENTS } from '../../../core/app.tokens';

interface PexelsCacheEntry {
  images: PexelsImage[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class PexelsService {
  private readonly cache = new Map<string, PexelsCacheEntry>();
  private readonly baseUrl = 'https://api.pexels.com/v1';

  constructor(
    private readonly httpClient: HttpClient,
    @Inject(ENVIRONMENTS) private readonly environments: any
  ) {}

  searchBackgrounds(
    query?: string,
    page: number = 1,
    perPage?: number
  ): Observable<PexelsImage[]> {
    const cfg = this.getConfig();
    const effectiveQuery = (query || cfg.defaultQuery || 'texture').trim();
    const effectivePerPage = perPage || cfg.resultsPerPage || 12;
    const cacheKey = `${effectiveQuery}:${page}:${effectivePerPage}`;

    this.clearExpiredCache(cfg.cacheDuration);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return of(cached.images);
    }

    if (!cfg.apiKey) {
      return of([]);
    }

    const params = new HttpParams()
      .set('query', effectiveQuery)
      .set('page', page.toString())
      .set('per_page', effectivePerPage.toString())
      .set('orientation', 'landscape');

    const headers = new HttpHeaders({ Authorization: cfg.apiKey });

    return this.httpClient
      .get<PexelsResponse>(`${this.baseUrl}/search`, { params, headers })
      .pipe(
        map((response) => this.mapResponse(response)),
        tap((images) => {
          this.cache.set(cacheKey, { images, timestamp: Date.now() });
        }),
        catchError(() => of([]))
      );
  }

  getTrendingBackgrounds(page: number = 1): Observable<PexelsImage[]> {
    return this.searchBackgrounds('texture abstract background', page);
  }

  private mapResponse(response: PexelsResponse): PexelsImage[] {
    return (response?.photos ?? []).map((photo) => ({
      id: String(photo.id),
      urls: {
        thumb: photo.src.medium,
        regular: photo.src.large2x,
        full: photo.src.original,
      },
      photographer: photo.photographer,
      pageUrl: photo.url,
    }));
  }

  private getConfig() {
    const cfg = this.environments?.pexels ?? {};
    return {
      apiKey: cfg.apiKey || '',
      defaultQuery: cfg.defaultQuery || 'texture',
      resultsPerPage: Number(cfg.resultsPerPage || 12),
      cacheDuration: Number(cfg.cacheDuration || 3600000),
    };
  }

  private clearExpiredCache(ttl: number): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }
}

interface PexelsResponse {
  photos: PexelsRawPhoto[];
}

interface PexelsRawPhoto {
  id: number;
  photographer: string;
  url: string;
  src: {
    original: string;
    large: string;
    large2x: string;
    medium: string;
    small: string;
    tiny: string;
  };
}

export interface PexelsImage {
  id: string;
  urls: {
    thumb: string;
    regular: string;
    full: string;
  };
  photographer: string;
  pageUrl: string;
}
