import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArtFacadeService } from '../../../shared/services/new-art.facade';
import { IArtDoc } from '../../../shared/domaine/entities/art';

@Component({
  selector: 'maker-tags-art-doc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './art-doc.component.html',
  styleUrl: './art-doc.component.scss',
})
export class ArtDocComponent {

artDoc?:IArtDoc;
private artfacadeservice = inject(ArtFacadeService);
  

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

    this.artfacadeservice?.artDocState$?.subscribe((artDoc)=>{
       this.artDoc = artDoc.item;

    })
    
  }

}
