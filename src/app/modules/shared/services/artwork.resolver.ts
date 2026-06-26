import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { FirebaseStorageService } from './firebase-storage.service';
import { ArtDocsService } from './art-docs.service';

@Injectable({ providedIn: 'root' })
export class ArtworkResolver implements Resolve<any> {
  constructor(private firebaseServiceApi: FirebaseStorageService, private artDocService:ArtDocsService) {}

resolve(route: ActivatedRouteSnapshot): Observable<any> {
  const id = route.paramMap.get('id');
  if (!id) {
    console.error('No artwork ID in route');
    return of(null);
  }
  return this.artDocService.getArtworkByid(id);
}
}
