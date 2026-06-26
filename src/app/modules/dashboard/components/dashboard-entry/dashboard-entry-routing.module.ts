import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboarLayoutdComponent } from '../dashboard-layout/dashboard-layout.component';
import { ListArtsComponent } from '../list-arts/list-arts.component';
import { AssetsComponent } from '../assets/assets.component';
import { SiteConfigComponent } from '../site-config/site-config.component';
import { QuestionsManageComponent } from '../questions-manage/questions-manage.component';
import { CategoriesListComponent } from '../categories-list/categories-list.component';
import { AnalyticsComponent } from '../analytics/analytics.component';
import { UsersPurchasesComponent } from '../users-purchases/users-purchases.component';
const routes: Routes = [
  {
    path:'',
    component:DashboarLayoutdComponent,
    children:[
      {
        path:'',
        component:ListArtsComponent
      },
      {
        path:'assets',
        component:AssetsComponent
      },
      {
        path:'config',
        component:SiteConfigComponent
      },
      {
        path:'questions',
        component:QuestionsManageComponent
      },
      {
        path:'categories',
        component:CategoriesListComponent
      },
      {
        path:'analytics',
        component:AnalyticsComponent
      },
      {
        path:'users-purchases',
        component:UsersPurchasesComponent
      }
      
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardEntryRoutingModule { }
