import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { nanoid } from 'nanoid';
// import * as _ from 'lodash';
import { set } from 'lodash';
import { ICanvaProps } from '../../../shared/domaine/entities/canva';
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';
import { IArtPage } from '../../../shared/domaine/entities/art';


// export const textBlockInit:ITextBlock = {

//   id:nanoid()
//   type:'title',
//   text:{
//     text:'Title Type',
//     color:'#000',
//     fontFamily:'Arial',
//     fontSize:30,
//     left:30,
//     top:50,
//     textAlign:'center'
//   }
// }

@Component({
  selector: 'maker-tags-add-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-text.component.html',
  styleUrl: './add-text.component.css',
})
export class AddTextComponent {
  
  currentArt?:IArtPage
  canvaProps?:ICanvaProps
  constructor(private canvaUtilService:CanvasUtilsService){

  }


  ngOnInit(): void {

  }

  addText(value:string){
    this.canvaUtilService.setAddElementEvent({name:'addText',value:{isBoxText:false,value:value}})
  }
  addTextBox(value:string){
    this.canvaUtilService.setAddElementEvent({name:'addText',value:{isBoxText:true,value:value}})
  }
}
