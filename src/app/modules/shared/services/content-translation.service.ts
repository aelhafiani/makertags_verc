import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

const FAL_KEY = '4ba42982-2aca-430b-a72f-5739c44ec0d7:6588bc1f6aaa9ae97dc25b67561fedfb';

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish',
  de: 'German',
  fr: 'French',
};

@Injectable({ providedIn: 'root' })
export class ContentTranslationService {
  private cache = new Map<string, Observable<string>>();

  constructor(private http: HttpClient) {}

  translate(text: string, lang: string): Observable<string> {
    if (!text?.trim() || lang === 'en') return of(text);

    const key = `${lang}::${text}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const langName = LANG_NAMES[lang] ?? lang;
    const hasHtml = /<[a-z][\s\S]*>/i.test(text);

    const prompt = hasHtml
      ? `Translate the following HTML content to ${langName}. Keep all HTML tags and attributes exactly unchanged. Return ONLY the translated HTML, no explanation or markdown:\n\n${text}`
      : `Translate the following text to ${langName}. Return ONLY the translation, no explanation:\n\n${text}`;

    const obs$ = this.http
      .post<{ output: string }>(
        'https://fal.run/fal-ai/any-llm',
        { model: 'google/gemini-2.0-flash-001', prompt },
        { headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }) }
      )
      .pipe(
        map(res => res?.output?.trim() || text),
        catchError(() => of(text)),
        shareReplay(1)
      );

    this.cache.set(key, obs$);
    return obs$;
  }
}
