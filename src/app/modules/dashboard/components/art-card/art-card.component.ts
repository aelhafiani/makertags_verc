import { Component, Input, Output ,EventEmitter} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { IArtDoc } from '../../../shared/domaine/entities/art';
import { FirebaseStorageService } from '../../../shared/services/firebase-storage.service';
import { ArtDocsService } from '../../../shared/services/art-docs.service';

@Component({
  selector: 'maker-tags-art-card',
  templateUrl: './art-card.component.html',
  styleUrl: './art-card.component.css',
  standalone: false,
})
export class ArtCardComponent {

  @Input() art?: IArtDoc;
  @Output() docDeleted = new EventEmitter<boolean>();
  @Output() onEditDoc = new EventEmitter<string>();
  constructor(private modal: NzModalService,
    private artDocService:ArtDocsService,
    private message: NzMessageService,
    private router:Router){}

  removeArt() {
    this.modal.confirm({
      nzTitle: 'Are you sure delete this task?',
      nzContent: '<b style="color: red;">Some descriptions</b>',
      nzOkText: 'Yes',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => this.deleteArt(),
      nzCancelText: 'No',
      nzOnCancel: () => console.log('Cancel')
    });
  }
  deleteArt(){
    if(!this.art?.id) return;
    this.artDocService.removeArtDoc(this.art.id).subscribe({
      next: (success) => {
        if (success) {
          this.message.success('Deleted successfully');
          this.docDeleted.emit(true);
        } else {
          this.message.error('Failed to delete');
          this.docDeleted.emit(false);
        }
      },
      error: () => {
        this.message.error('Failed to delete');
        this.docDeleted.emit(false);
      }
    });
  }
  editArt(docId:any){
    this.onEditDoc.emit(docId)  
  }
}
