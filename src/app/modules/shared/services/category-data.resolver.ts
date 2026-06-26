import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { from, Observable } from 'rxjs';
import { CategoriesService } from './categories.service';

@Injectable({ providedIn: 'root' })
export class CategoryDataResolver implements Resolve<any> { 
  constructor(private categoriesService: CategoriesService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const categoryValue = route.paramMap.get('category');
    return from(this.categoriesService.getCategoryByValue(categoryValue!));
  }
}
