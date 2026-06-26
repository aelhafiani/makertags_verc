import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ENVIRONMENTS } from '../../../core/app.tokens';

interface UnsplashCacheEntry {
  response: UnsplashResponse;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class UnsplashService {
  private readonly cache = new Map<string, UnsplashCacheEntry>();

  constructor(
    private readonly httpClient: HttpClient,
    @Inject(ENVIRONMENTS) private readonly environments: any
  ) {}

  searchBackgrounds(
    query?: string,
    page: number = 1,
    perPage?: number
  ): Observable<UnsplashImage[]> {
    const config = this.getConfig();
    const effectiveQuery = (query || config.defaultQuery || 'texture').trim();
    const effectivePerPage = perPage || config.resultsPerPage || 12;
    const cacheKey = `${effectiveQuery}:${page}:${effectivePerPage}`;

    this.clearExpiredCache();
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return of(cached.response.results);
    }

    if (!config.accessKey) {
      return of([]);
    }

    const params = new HttpParams()
      .set('query', effectiveQuery)
      .set('page', page.toString())
      .set('per_page', effectivePerPage.toString())
      .set('client_id', config.accessKey)
      .set('orientation', 'landscape');

    return this.httpClient
      .get<UnsplashResponse>(`${config.baseUrl}/search/photos`, { params })
      .pipe(
        tap((response) => {
          this.cache.set(cacheKey, { response, timestamp: Date.now() });
        }),
        map((response) => response.results || []),
        catchError(() => of([]))
      );
  }

  getTrendingBackgrounds(page: number = 1): Observable<UnsplashImage[]> {
    return this.searchBackgrounds('texture wave abstract marble', page);
  }

  private clearExpiredCache(): void {
    const ttl = this.getConfig().cacheDuration || 3600000;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  private getConfig(): UnsplashConfig {
    const cfg = this.environments?.unsplash ?? {};
    return {
      accessKey: cfg.accessKey || '',
      baseUrl: cfg.baseUrl || 'https://api.unsplash.com',
      defaultQuery: cfg.defaultQuery || 'texture',
      resultsPerPage: Number(cfg.resultsPerPage || 12),
      cacheDuration: Number(cfg.cacheDuration || 3600000),
    };
  }
}

interface UnsplashConfig {
  accessKey: string;
  baseUrl: string;
  defaultQuery: string;
  resultsPerPage: number;
  cacheDuration: number;
}

interface UnsplashResponse {
  results: UnsplashImage[];
}

export interface UnsplashImage {
  id: string;
  urls: {
    thumb: string;
    regular: string;
    full: string;
  };
  user: {
    name: string;
    username: string;
  };
  links: {
    html: string;
    download: string;
  };
}
