import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

@Component({
  selector: 'maker-tags-base-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-component.component.html',
  styleUrl: './base-component.component.css',
})
export class BaseComponentComponent {

  public destroy$: Subject<boolean> = new Subject<boolean>();

  public ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete(); 
    this.destroy$.unsubscribe();
  }
}
