import { Route } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { AdminAuthGuard } from './core/admin.guard';
import { HomeComponent } from './home/home.component';
import { PublicArtViewComponent } from './modules/catalog/components/public-art-view/public-art-view.component';

export const appRoutes: Route[] = [
   
    {
        path:'dashboard',
        loadChildren: () => import('./modules/dashboard/components/dashboard-entry/dashboard-entry.module').then(
            (m) => m.DashboardEntryModule
        ),
        canActivate: [AuthGuard , AdminAuthGuard],
    },
    {
        path:'auth',
        loadChildren: () => import('./modules/auth/auth-entry/auth-entry-routing.module').then(
            (m) => m.AuthEntryRoutingModule
        )
    },
    {
        path:'creator',
        loadChildren: () => import('./modules/author/components/lib.routes').then(
            (m) => m.authorRoutes
        )
    },
{
    path: '',
    component: HomeComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./modules/catalog/catalog.module').then(
            (m) => m.CatalogModule
          ),
      },
    ],
  }, 
    {
        path: '',
        redirectTo: 'home',
        pathMatch : 'full'
    },
    {
        path: 'public-art/:slug',
        component: PublicArtViewComponent
    },
   
    { path: '**', redirectTo: '/' }
];
