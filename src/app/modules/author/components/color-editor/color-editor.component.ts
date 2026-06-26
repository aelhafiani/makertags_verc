import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';

@Component({
  selector: 'maker-tags-color-editor',
  standalone: true,
  imports: [CommonModule,NzColorPickerModule],
  templateUrl: './color-editor.component.html',
  styleUrl: './color-editor.component.scss',
})
export class ColorEditorComponent {

  colorSwatche = ['100C08','010B13','242124','414A4C','353839','111111','1A1110','343434','1B1B1B','555D50','36454F','4B3621','000000','2F4F4F','4D5D53','2A3439','536878','555555',
  '696969','708090','808080','848482','8B8589','8C92AC','91A3B0',
  '98817B', 'DBD7D2', 'F5F5F5', 'FFFFFF', 'FFFAFA', 'F7F7F7', 'E5E4E2', 'EAE0C8', 'F1E9D2', 'FDF5E6', 'E9FFDB', 'F5FFFA', 'F8F4FF', 'FAF0E6', 'F4F0EC', 'F8F8FF', 'FFFAF0', 'F0EAD6', 'EFDFBB', 'FFF8DC', 'FEFEFA', 'FAEBD7', 'F2F3F4', 'EDEAE0', 'DE6FA1', 'FC89AC', 'FFF5EE', 'F9429E', 'B3446C', 'E3256B', 'ED7A9B', 'F77FBE', 'FE28A2', 'FFCBA4', 'EDCDC2', 'F2BDCD', 'FFDAE9', 'E4007C', 'FBAED2', 'FF69B4', 'FF00CC', 'F400A1', 'C74375', 'F64A8A', 'D71868', 'FF1493', 'F56FA1', 'A8516E', 'FFB7C5', 'F1DDCF', 'FFA6C9', 'DE5D83', 'F19CBB', 'EE82EE', 'CF3476', 'CF71AF', 'FF6FFF', 'FC0FC0', 'AA98A9', 'FF66CC', 'FF33CC', 'E30B5C', '8E3A59', 'FE4EDA', 8e4585, '9F4576', 'D0417E', 'F653A6', 'FF0090', 'CA1F7B', 'FF1DCE', 683068, '8B008B', 'FF91AF', 'E52B50', 'C9A0DC', '8000FF', 'A020F0', 645394, '66023C', '9683EC', 'D8BFD8', 512888, 'CC33CC', '6A5ACD', '32174D', 'C71585', '7851A9', 663399, '9A4EAE', 800080, 'CC8899', '86608E', 'DDA0DD', 'DBB2D1', 'DF00FF', '32127A', 'FAE6FA', 682860, 'DA70D6', '8B004B', 'C54B8C', '997A8D', '8D029B', 'E0B0FF', 880085, 'C8A2C8', 'E6E6FA', 'B57EDC', 'FFF0F5', '5B3256', '5A4FCF', 'DF73FF', '6F2DA8', 'FF00FF', '8806CE', 'D473D4'
].reverse()

colorGradien = [
  ["rgb(0, 0, 0) 0%", "rgb(115, 115, 115) 100%"],
  ["rgb(0, 0, 0) 0%", "rgb(200, 145, 22) 100%"],
  ["rgb(0, 0, 0) 0%", "rgb(53, 51, 205) 100%"],
  ["rgb(166, 166, 166) 0%", "rgb(255, 255, 255) 100%"],
  ["rgb(255, 247, 173) 0%", "rgb(255, 169, 249) 100%"],
  ["rgb(205, 255, 216) 0%", "rgb(148, 185, 255) 100%"],
  ["rgb(255, 49, 49) 0%", "rgb(255, 145, 77) 100%"],
  ["rgb(255, 87, 87) 0%", "rgb(140, 82, 255) 100%"],
  ["rgb(81, 112, 255) 0%", "rgb(255, 102, 196) 100%"],
  ["rgb(0, 74, 173) 0%", "rgb(203, 108, 230) 100%"],
  ["rgb(140, 82, 255) 0%", "rgb(92, 225, 230) 100%"],
  ["rgb(93, 224, 230) 0%", "rgb(0, 74, 173) 100%"],
  ["rgb(140, 82, 255) 0%", "rgb(0, 191, 99) 100%"],
  ["rgb(0, 151, 178) 0%", "rgb(126, 217, 87) 100%"],
  ["rgb(12, 192, 223) 0%", "rgb(255, 222, 89) 100%"],
  ["rgb(255, 222, 89) 0%", "rgb(255, 145, 77) 100%"],
  ["rgb(255, 102, 196) 0%", "rgb(255, 222, 89) 100%"],
  ["rgb(140, 82, 255) 0%", "rgb(255, 145, 77) 100%"],
]
  constructor(private canvaService:CanvasUtilsService){}

  changeColor(event:any){
   this.canvaService.setEditorEvent({name:'canva-color',value:event.color.originalInput})
   
  }
  changeColorSwitch(color:any){
    this.canvaService.setEditorEvent({name:'canva-color',value:"#"+color})
  }
}
