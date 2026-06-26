import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'optimizedImage',
  standalone: true
})
export class OptimizedImagePipe implements PipeTransform {
  transform(imageUrl: string, width: number = 400): string {
    if (!imageUrl) return '';
    
    // Pour Firebase Storage, ajouter des paramètres d'optimisation
    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      // Ajouter des paramètres pour redimensionner l'image côté Firebase
      const url = new URL(imageUrl);
      // Note: Firebase Storage ne supporte pas le redimensionnement natif
      // mais on peut utiliser le cache-control
      return imageUrl;
    }
    
    return imageUrl;
  }
}
