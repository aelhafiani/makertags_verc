import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'sanitizeHtml',standalone: true })
export class SanitizeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(html: string): SafeHtml {
    if (!html) return '';
    // Remove empty <p></p> tags and their variants
    const cleanedHtml = html
    .replace(/<(\w+)([^>]*?)\s*>(?:&nbsp;|\s)*<\/\1>/gmi, '') // Standard empty tags
    .replace(/<[^/>]+><\/[^>]+>/g, '') // Fallback for malformed tags
    .replace(/<(\w+)([^>]*?)\s*\/>/g, '<$1$2>');
    return this.sanitizer.bypassSecurityTrustHtml(cleanedHtml);
  }
}