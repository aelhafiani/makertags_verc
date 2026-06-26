import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IArtDoc } from '../domaine/entities/art';
import { ENVIRONMENTS } from '../../../core/app.tokens';

@Injectable({
  providedIn: 'root'
})
export class AssetsApiService {

  constructor(
    @Inject(ENVIRONMENTS) private environments: any,
    private http: HttpClient
  ) {}

  getImagesFromPixaBay(type: string, image_cat: string, category: string): Observable<any> {
    const PIXABAY_API_KEY = this.environments.pixabayApiKey;
    const url = `${this.environments.pixabayApiUrl}?key=${PIXABAY_API_KEY}&q=${image_cat}&image_type=${type}&category=${category}`;
    return this.http.get(url);
  }

  getResourcesFreePik(term: string, type: string): Observable<any> {
    const headers = new HttpHeaders({
      'x-freepik-api-key': this.environments.freepikApiKey,
      'Accept-Language': 'en',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    });

    const params = {
      limit: 10,
      term,
      'filters[license][freemium]': 1,
      'filters[ai-generated][excluded]': 1,
      'filters[vector][type]': type,
      'filters[content_type][vector]': 1
    };

    return this.http.get('/api/v1/resources', { headers, params });
  }

  generateTinyUrlPreview(art: IArtDoc) {
    const body = {
      url: art.preview_realized_art,
      domain: 'tinyurl.com',
      alias: art.id,
      description: art.description
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.environments.tinyurlApiKey}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(this.environments.tinyurlApiUrl + '/create', body, { headers }).toPromise();
  }
}
