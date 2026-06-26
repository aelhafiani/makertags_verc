import { Routes } from '@angular/router';

export const modeldetailRoutes: Routes = [
    {
      path: ':id',
      loadComponent: () =>
        import('./art-detail.component').then(
          (m) => m.ArtDetailComponent
        ),
    },
  ]