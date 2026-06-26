import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { takeUntil } from 'rxjs';
import { BaseComponentComponent } from '../../../../shared/shared/base-component/base-component.component';
import { CanvasUtilsService } from '../../../../shared/canvas/canvas.utils.service';
import { ArtFacadeService } from '../../../../shared/services/new-art.facade';
import { IArtPage } from '../../../../shared/domaine/entities/art';



enum textStyleFormat {
  bold = 'bold',
  italic='italic',
  underline='underline',
  strikethrough='strikethrough',
  case='case',
  center='center',
  left='left',
  right='right',
  justify='justify',
  ordered='ordered',
  unordered='unordered'
}



@Component({
  selector: 'maker-tags-text-align-editor',
  standalone: true,
  imports: [CommonModule,NzIconModule],
  templateUrl: './text-align-editor.component.html',
  styleUrl: './text-align-editor.component.scss',
})
export class TextAlignEditorComponent extends BaseComponentComponent{

  private canvasService = inject(CanvasUtilsService)
  private newArtFacade = inject(ArtFacadeService)

  currentArt!:IArtPage;
  textStyleFormat = textStyleFormat 
  styles:string[] = []
  stylesFormats = {
    bold : false,
    italic : false,
    underline : false,
    strikethrough : false,
    case:false
  }
  textAlign:string=''
  ngOnInit(): void {

    
    this.newArtFacade.newArtState$?.pipe(takeUntil(this.destroy$)).subscribe((newArt) => {
      const selectedObj = newArt.item.selectedObj
      console.log(selectedObj)
      this.stylesFormats.bold = selectedObj?.fontWeight ? true : false
      this.stylesFormats.italic = selectedObj?.fontStyle == 'italic' ? true : false
      this.stylesFormats.underline = selectedObj?.underline
      this.stylesFormats.strikethrough = selectedObj?.linethrough
      this.textAlign =selectedObj?.textAlign
    })
      
  }

  isStyleExiste(style:string):boolean{
    return this.styles.includes(style)
  }

  applyTextAlign(style:string){
     this.textAlign = style
     this.canvasService.setEditorEvent({name:'textAlign', value:style})
  }
  applyStyleFormat(style:boolean,type:string){

      switch(type) { 
        case textStyleFormat.bold: { 
          this.stylesFormats.bold = !this.stylesFormats.bold
          this.stylesFormats.bold ?  this.canvasService.setEditorEvent({name:'fontWeight', value:'bold'}) : this.canvasService.setEditorEvent({name:'fontWeight', value:'normal'})
           break; 
        } 
        case textStyleFormat.italic: { 
          this.stylesFormats.italic = !this.stylesFormats.italic
          this.stylesFormats.italic ? this.canvasService.setEditorEvent({name:'fontStyle', value:'italic'}) : this.canvasService.setEditorEvent({name:'fontStyle', value:'normal'})
           break; 
        } 
        case textStyleFormat.underline: { 
          this.stylesFormats.underline = !this.stylesFormats.underline
          this.stylesFormats.underline ? this.canvasService.setEditorEvent({name:'underline', value:true}) : this.canvasService.setEditorEvent({name:'underline', value:false})
          break; 
       } 
       case textStyleFormat.strikethrough: { 
        this.stylesFormats.strikethrough = !this.stylesFormats.strikethrough; 
        this.stylesFormats.strikethrough ? this.canvasService.setEditorEvent({name:'linethrough', value:true}) : this.canvasService.setEditorEvent({name:'linethrough', value:false})
        break; 
     } 
  
        default: { 
           //statements; 
           break; 
        } 
     } 

  }
  
}
