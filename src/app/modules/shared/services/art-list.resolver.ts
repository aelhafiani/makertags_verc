import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { FirebaseStorageService } from './firebase-storage.service';
import { ArtDocsService } from './art-docs.service';

@Injectable({ providedIn: 'root' })
export class ArtListResolver  {
  constructor(private firebaseStorageService: FirebaseStorageService, private artDocService:ArtDocsService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.artDocService.getFilteredArts()
  }
}
