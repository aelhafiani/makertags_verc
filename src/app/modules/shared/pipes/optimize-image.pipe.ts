import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'optimizeImage',
  standalone: true
})
export class OptimizeImagePipe implements PipeTransform {
  // ImageKit.io endpoint (gratuit 20GB/mois)
  private readonly IMAGEKIT_URL = 'https://ik.imagekit.io/rrdxzdrxy';
  
  transform(imageUrl: string, width: number = 350): string {
    if (!imageUrl) return '';
    
    try {
      // Encode l'URL Firebase en base64 pour ImageKit
      // Format: https://ik.imagekit.io/your_imagekit_id/tr:w-350,f-webp,q-80/ot-base64_encoded_url
      const encodedUrl = Buffer.from(imageUrl).toString('base64');
      const transformations = `tr:w-${width},f-webp,q-80,fo-auto`;
      return `${this.IMAGEKIT_URL}/${transformations}/${encodedUrl}`;
    } catch (error) {
      console.error('Error optimizing image:', error);
      return imageUrl;
    }
  }
}
