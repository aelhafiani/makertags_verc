import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardEntryRoutingModule } from './dashboard-entry-routing.module';
import { RouterModule } from '@angular/router';
import { DashboarLayoutdComponent } from '../dashboard-layout/dashboard-layout.component';
import { ListArtsComponent } from '../list-arts/list-arts.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AssetsComponent } from '../assets/assets.component';
import { ArtCardComponent } from '../art-card/art-card.component';
import { QuillModule } from 'ngx-quill';
import { SharedUiComponentsModule } from '../../../shared/shared-ui-components.module';


@NgModule({
  declarations: [
    DashboarLayoutdComponent,
    ListArtsComponent,
    AssetsComponent,
    ArtCardComponent
  ],
  imports: [
    SharedUiComponentsModule,
    RouterModule,
    CommonModule, 
    DashboardEntryRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    QuillModule.forRoot({
      customOptions: [{
        import: 'formats/whitespace',
        whitelist: ['normal']
      }]
    })
  ],
  bootstrap:[ListArtsComponent]
})
export class DashboardEntryModule { }
