import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { set } from 'lodash';
import { takeUntil } from 'rxjs';
import { BaseComponentComponent } from '../../../shared/shared/base-component/base-component.component';
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';
import { ArtFacadeService } from '../../../shared/services/new-art.facade';
import { ArtService } from '../../../shared/services/new-art.service';
import { IArtPage } from '../../../shared/domaine/entities/art';


@Component({
  selector: 'maker-tags-opacity-editor',
  standalone: true,
  imports: [CommonModule,CommonModule,NzSliderModule,FormsModule],
  templateUrl: './opacity-editor.component.html',
  styleUrl: './opacity-editor.component.css',
})
export class OpacityEditorComponent extends BaseComponentComponent{

  private canvasService = inject(CanvasUtilsService)
  opacity:number = 1;
  currentArt!:IArtPage;
  private artFacade = inject(ArtFacadeService)
  private artService = inject(ArtService)

  ngOnInit(): void {
      
    this.artFacade.newArtState$?.pipe(takeUntil(this.destroy$)).subscribe((newArt) => {
      this.opacity = newArt.item.selectedObj?.opacity
    })
  }



  updateOpacity(){
    this.canvasService.setEditorEvent({name:'opacity', value:this.opacity})
  }

}
