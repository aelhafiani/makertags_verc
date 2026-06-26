import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { takeUntil } from 'rxjs';
import { BaseComponentComponent } from '../../../../shared/shared/base-component/base-component.component';
import { CanvasUtilsService } from '../../../../shared/canvas/canvas.utils.service';
import { ArtFacadeService } from '../../../../shared/services/new-art.facade';
import { ArtService } from '../../../../shared/services/new-art.service';
import { IArtPage } from '../../../../shared/domaine/entities/art';

@Component({
  selector: 'maker-tags-text-spacing-editor',
  standalone: true,
  imports: [CommonModule,NzSliderModule,FormsModule,NzInputModule,NzInputNumberModule,NzGridModule],
  templateUrl: './text-spacing-editor.component.html',
  styleUrl: './text-spacing-editor.component.scss',
})
export class TextSpacingEditorComponent extends BaseComponentComponent {
  charSpacing :number = 0
  lineHeight:number = 0

  private canvasService = inject(CanvasUtilsService)
  currentArt!:IArtPage;
  private artFacade = inject(ArtFacadeService)
  private artService = inject(ArtService)
  ngOnInit(): void {

    this.artFacade.newArtState$?.pipe(takeUntil(this.destroy$)).subscribe((newArt) => {
      this.lineHeight = newArt.item.selectedObj?.lineHeight
      this.charSpacing = newArt.item.selectedObj?.charSpacing
    })
     
  }

  updateLineHeight(){
   this.canvasService.setEditorEvent({name:'lineHeight', value:this.lineHeight})
  }

  updateLetterSpacing(){
    this.canvasService.setEditorEvent({name:'charSpacing', value:this.charSpacing})
  }
}
