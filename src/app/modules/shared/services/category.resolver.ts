import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { FirebaseStorageService } from './firebase-storage.service';
import { ArtDocsService } from './art-docs.service';

@Injectable({ providedIn: 'root' })
export class CategoryResolver implements Resolve<any> {
  constructor( private artDocsService:ArtDocsService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const category = route.paramMap.get('category');
    return this.artDocsService.getArtByCategory(category!);
  }
}
