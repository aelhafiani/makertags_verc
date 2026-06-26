import { Component, Input, OnInit, Output,EventEmitter, inject, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { extend, set } from 'lodash';
import { takeUntil } from 'rxjs';
import { BaseComponentComponent } from '../../../../shared/shared/base-component/base-component.component';
import { CanvasUtilsService } from '../../../../shared/canvas/canvas.utils.service';
import { ArtFacadeService } from '../../../../shared/services/new-art.facade';
import { IArtPage } from '../../../../shared/domaine/entities/art';

@Component({
  selector: 'maker-tags-text-editor-size',
  standalone: true,
  imports: [CommonModule,NzSliderModule,FormsModule,NzInputModule,NzInputNumberModule,NzGridModule  ],
  templateUrl: './text-editor-size.component.html',
  styleUrl: './text-editor-size.component.scss',
})
export class TextEditorSizeComponent extends BaseComponentComponent implements OnInit {
  

  currentArt!:IArtPage;
  private canvasService = inject(CanvasUtilsService)
  private newArtFacade = inject(ArtFacadeService)
  @Output() outputData = new EventEmitter<number>(); 

  defaultsize!:number;
  sizeValue = 0

  ngOnInit(): void {
    this.newArtFacade.newArtState$?.pipe(takeUntil(this.destroy$)).subscribe((newArt) => {
      this.sizeValue = newArt.item.selectedObj?.get('fontSize') || 0
    })
  }

  changeValueSize(): void {
    this.canvasService.setEditorEvent({name:'fontSize', value:this.sizeValue})
  }

}
