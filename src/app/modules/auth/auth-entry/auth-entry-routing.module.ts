import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [

  {
    path:'google-login-callback',
    loadComponent: () => import('../login-callback/google-login-callback.component').then(m => m.GoogleLoginCallbackComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthEntryRoutingModule { }
