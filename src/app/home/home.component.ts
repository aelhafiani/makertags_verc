import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../modules/shared/ui-components/header/header.component';

@Component({
  selector: 'maker-tags-home',
  standalone: true,
  imports: [CommonModule,HeaderComponent,RouterModule ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly currentYear = new Date().getFullYear();

  



  


  
  
  
}
