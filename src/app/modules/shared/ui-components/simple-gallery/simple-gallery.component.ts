import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'maker-tags-simple-gallery',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './simple-gallery.component.html',
  styleUrl: './simple-gallery.component.scss',
})
export class SimpleGalleryComponent {
  @Input() userImages = [
    'https://via.placeholder.com/800x400?text=Image+1',
    'https://via.placeholder.com/800x400?text=Image+2',
    'https://via.placeholder.com/800x400?text=Image+3',
    'https://via.placeholder.com/800x400?text=Image+4',
  ];
  selectedImageIndex = 0;
  isGalleryOpen = false;

  openGallery(index: number): void {
    this.selectedImageIndex = index;
    this.isGalleryOpen = true;
  }

  closeGallery(): void {
    this.isGalleryOpen = false;
  }

  navigate(direction: number): void {
    const totalImages = this.userImages.length;
    this.selectedImageIndex = (this.selectedImageIndex + direction + totalImages) % totalImages;
  }
}
