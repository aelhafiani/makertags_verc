import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';




export enum POSITIONS {

  bringToFront = 'bringToFront',
  bringForward = 'bringForward',
  sendToBack = 'sendToBack',
  sendBackwards = 'sendBackwards'
} 

@Component({
  selector: 'maker-tags-superposition-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './superposition-editor.component.html',
  styleUrl: './superposition-editor.component.scss',
})
export class SuperpositionEditorComponent {

  private canvasService = inject(CanvasUtilsService)

  positions = POSITIONS
  
  setPosition(value:string){
    this.canvasService.setEditorEvent({name:'position',value:value})
  }
}
