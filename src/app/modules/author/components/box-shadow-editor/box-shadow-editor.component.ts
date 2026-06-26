import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { FormsModule } from '@angular/forms';
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';


@Component({
  selector: 'maker-tags-box-shadow-editor',
  standalone: true,
  imports: [CommonModule,NzColorPickerModule,NzSliderModule,FormsModule],
  templateUrl: './box-shadow-editor.component.html',
  styleUrl: './box-shadow-editor.component.scss',
})
export class BoxShadowEditorComponent {

  private canvasService = inject(CanvasUtilsService)

  boxSahdow =  signal<any>({
    color: '#000000',
    blur: 0,
    offsetX: 0,
    offsetY: 0
  })
  blurValue:number = 0;
  ofssetX:number = 0;
  offsetY:number = 0;

  changeColor(event:any){
    this.boxSahdow().color = event.color.originalInput
    this.canvasService.setEditorEvent({name:'shadow',value:this.boxSahdow()})
  }
  changeBlur(){
    this.boxSahdow().blur = this.blurValue
    this.canvasService.setEditorEvent({name:'shadow', value:this.boxSahdow()})
  }
  changeOffsetX(){
    this.boxSahdow().offsetX = this.ofssetX
    this.canvasService.setEditorEvent({name:'shadow', value:this.boxSahdow()})
  }
  changeOffsetY(){
    this.boxSahdow().offsetY = this.offsetY
    this.canvasService.setEditorEvent({name:'shadow-ofssetY', value:this.boxSahdow()})
  }
}
