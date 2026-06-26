import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrlPipe } from '../../../shared/pipes/safeUrl/safeUrl.pipe';

@Component({
  selector: 'maker-tags-product-gallery',
  standalone: true,
  imports: [CommonModule,SafeUrlPipe],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.css',
})
export class ProductGalleryComponent {
  @Input() images: any[] = [];

  selectedMedia: any = this.images[0];

  ngOnInit(): void {
    this.selectedMedia = this.images[0];

  }
  selectMedia(image: string) {
    this.selectedMedia = image; 
  }
}
