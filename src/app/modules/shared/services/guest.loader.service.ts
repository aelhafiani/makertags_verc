import { Injectable } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';

@Injectable({ providedIn: 'root' })
export class GuestLoaderService {
  private modalRef: any;

  constructor(private modal: NzModalService) {}

  show(message: string = 'Authentification en cours...') {
    if (this.modalRef) return; // éviter doublons

    this.modalRef = this.modal.create({
      nzTitle: '',
      nzContent: `<div class="text-center"><nz-spin nzTip=""></nz-spin>${message}</div>`,
      nzClosable: false,
      nzMaskClosable: false,
      nzFooter: null,
      nzCentered: true,
      nzMaskStyle: { 'background-color': 'rgba(0,0,0,0.3)' },
      nzBodyStyle: { padding: '30px' }
    });
  }

  hide() {
    if (this.modalRef) {
      this.modalRef.destroy();
      this.modalRef = null;
    }
  }
}
