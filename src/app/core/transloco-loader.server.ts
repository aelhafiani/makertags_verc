import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoServerLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    // Candidates in priority order:
    // 1. Vercel production: /var/task/dist/makertags/browser/assets/i18n/
    // 2. Local dev (ng serve SSR): src/assets/i18n/
    const candidates = [
      join(process.cwd(), 'dist/makertags/browser/assets/i18n', `${lang}.json`),
      join(process.cwd(), 'src/assets/i18n', `${lang}.json`),
    ];

    for (const filePath of candidates) {
      try {
        const data = readFileSync(filePath, 'utf-8');
        return of(JSON.parse(data) as Translation);
      } catch {
        // try next candidate
      }
    }

    console.warn(`[SSR] Could not load translation file for lang: ${lang}`);
    return of({} as Translation);
  }
}
