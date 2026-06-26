import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthorEntryRoutingModule } from './author-entry-routing.module';
import { PagesSelectorComponent } from '../pages-selector/pages-selector.component';
import { FormsModule } from '@angular/forms'; 
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AddElementsComponent } from '../add-elements/add-elements.component';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { SharedUiComponentsModule } from '../../../shared/shared-ui-components.module';


@NgModule({
  declarations: [   
    
    
  ],
  imports: [
    NzIconModule,
    CommonModule,
    AuthorEntryRoutingModule,
    SharedUiComponentsModule,
    AddElementsComponent,
    FormsModule,
    NzProgressModule,
    PagesSelectorComponent 
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AuthorEntryModule { }
