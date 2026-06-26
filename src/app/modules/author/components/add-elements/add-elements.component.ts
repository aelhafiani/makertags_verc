import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { groupBy, map } from 'lodash'; // Import Lodash
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';
import { AuthService } from '../../../shared/services/auth.service';
import { IArtPage } from '../../../shared/domaine/entities/art';
import { ArtDocsService } from '../../../shared/services/art-docs.service';

@Component({
  selector: 'maker-tags-add-elements',
  standalone: true,
  imports: [CommonModule, NzTabsModule, NzIconModule],
  templateUrl: './add-elements.component.html',
  styleUrls: ['./add-elements.component.scss'],
})
export class AddElementsComponent implements OnInit {
  tabs: any[] = []; // Initialize tabs as an empty array

  private canvaUtilService = inject(CanvasUtilsService);

  constructor(
    private authService: AuthService,
    private artDocService:ArtDocsService 
  ) {}

  currentArt!: IArtPage;
  images: any = [];
  basicForms = ['square', 'circle', 'triangle', 'line'];
  filesToUp?:FileList

  get isAdmin$(){
    return this.authService.isAdmin$
  }
  async ngOnInit() {

   this.authService.isAdmin$.subscribe((isAdmin) => {
    this.artDocService.getImagesByCategotiries().subscribe((data) => {
      const groupedData = groupBy(data, (doc) => doc.categorie);
    
      if(!isAdmin){
        this.tabs = map(groupedData, (items, categorie) => ({
          categorie,  
          items: items.map(item => item)
        })).filter((item: any) => item.categorie !== 'models');
      }else{
        this.tabs = map(groupedData, (items, categorie) => ({
          categorie, 
          items: items.map(item => item)
        }))
      }
      
  
    });
   })

 
  
  
  

  }
  handleChange(event:any){
    const file: File = event.target.files[0];
    if (file) {
      console.log('file',file)
      // this.usersFilesService.UploadFileToStore(target.file)
        
   
    }else{
      console.log('no type selected')
    }
  }
  addImageToCanva(image: any): void {
    this.canvaUtilService.setAddElementEvent({ name: 'addImage', value: image });
  }

  addFormToCanva(form: string): void {
    this.canvaUtilService.setAddElementEvent({ name: 'addForm', value: form });
  }
}
