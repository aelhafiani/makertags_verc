import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'maker-tags-dashboard',
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
  standalone: false

})
export class DashboarLayoutdComponent {

  constructor(private router:Router){}


  isCollapsed:boolean = false

navigateTest(){
  this.router.navigateByUrl('/creator')
}
}
