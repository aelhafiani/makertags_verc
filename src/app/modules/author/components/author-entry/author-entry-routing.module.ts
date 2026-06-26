import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthorLayoutComponent } from '../author/author.component';
import { EditorShellComponent } from '../shell/editor-shell.component';
// import { ArtDocComponent } from '../art-doc/art-doc.component';

const routes: Routes = [
  {
    path:'v2/:id',
    component:EditorShellComponent,
  },
  {
    path:'legacy/:id',
    component:AuthorLayoutComponent,
  },
  {
    path:':id',
    component:EditorShellComponent,
  },
  { path: '**', redirectTo: '/' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthorEntryRoutingModule { 

  
}
