import { Pipe, PipeTransform, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContentTranslationService } from '../services/content-translation.service';

@Pipe({ name: 'translateContent', standalone: true })
export class TranslateContentPipe implements PipeTransform {
  private service = inject(ContentTranslationService);

  transform(text: string, lang: string): Observable<string> {
    return this.service.translate(text, lang);
  }
}
