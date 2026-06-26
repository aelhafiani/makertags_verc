// meta.service.ts
import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class MetaService {
  constructor(private titleService: Title, private metaService: Meta) {}

  updateMeta(
    title: string,
    description: string,
    image: string = '' ,
    keywords?: string 
  ): void {
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    if (image) {
      this.metaService.updateTag({ property: 'og:image', content: image }); // Open Graph image
      this.metaService.updateTag({ property: 'twitter:image', content: image }); // Twitter Card image
    }
    // Add other meta tags as needed (keywords, etc.)
    if(keywords)
    this.metaService.addTag({ name: 'keywords', content: keywords }); // Example
  }
}