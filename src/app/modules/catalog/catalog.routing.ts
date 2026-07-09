import { Routes } from '@angular/router';
import { ArtListResolver } from '../shared/services/art-list.resolver';
import { ArtworkResolver } from '../shared/services/artwork.resolver';
import { CategoryResolver } from '../shared/services/category.resolver';
import { CategoryDataResolver } from '../shared/services/category-data.resolver';
import { AuthGuard } from '../../core/auth.guard';
import { questionsResolver } from '../shared/services/question.resolver';




export const catalogRoutes: Routes = [ 
  {
    path: '',
    loadComponent: () =>
      import('./home-content/home-content.component').then(
        (m) => m.HomeContentComponent
      ),
  },
  {
    path: 'tags',
    children: [
      {
        path: '',
        resolve: {
          artList: ArtListResolver
        },
        loadComponent: () =>
          import('./art-list/art-list.component').then((m) => m.ArtListComponent),
      },
      {
        path: ':title/:id',
        resolve: {
          artwork: ArtworkResolver
        },
        loadComponent: () =>
          import('./art-detail/art-detail.component').then((m) => m.ArtDetailComponent),
      }
    ]
  },
   
  {

    path:'privacy',
    loadComponent: () =>
      import('./privacy-page/privacy-page.component').then(
        (m) => m.PrivacyPageComponent
      ),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
      canActivate: [AuthGuard]
  },
  {
    path: 'purchase-success',
    loadComponent: () =>
      import('./purchase-success/purchase-success.component').then(
        (m) => m.PurchaseSuccessComponent
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./about/about.component').then(
        (m) => m.AboutComponent
      ),
  },
  {
    path: 'questions',
    resolve: {
      questions: questionsResolver
    },
    loadComponent: () =>
      import('./questions-page/questions-page.component').then(
        (m) => m.QuestionsPageComponent
      ),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./contact/contact.component').then(
        (m) => m.ContactComponent
      ),
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./pricing-page/pricing-page.component').then(
        (m) => m.PricingPageComponent
      ),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./terms-page/terms-page.component').then(
        (m) => m.TermsPageComponent
      ),
  },
  {
    path: 'refund-policy',
    loadComponent: () =>
      import('./refund-page/refund-page.component').then(
        (m) => m.RefundPageComponent
      ),
  },
  {
    path: 'detail/:id',
    loadComponent: () =>
      import('./art-detail/art-detail.component').then(
        (m) => m.ArtDetailComponent
      ),
  },
 {
        path: ':category',
        children: [
          {
            path: '',
            resolve: {
              artList: CategoryResolver,
              categoryData: CategoryDataResolver
            }, // Resolvers pour charger catégorie ET liste en parallèle
            loadComponent: () =>
              import('./list-by-category/list-by-category.component').then(
                (m) => m.ListByCategoryComponent
              ),
    
            },
            {
                path: ':title/:id',
                resolve: {
                  artwork: ArtworkResolver
                },
                loadComponent: () => import('./art-detail/art-detail.component').then(
                  (m) => m.ArtDetailComponent
                )
              }
          ]
          
      }
];

