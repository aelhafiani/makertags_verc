import { Pipe, PipeTransform } from "@angular/core";

// clean-html.pipe.ts
@Pipe({ name: 'cleanHtml',standalone: true })
export class CleanHtmlPipe implements PipeTransform{
  transform(value: string): string {
    return value?.replace(/&nbsp;/g, ' ') 
           || '';
  }
}