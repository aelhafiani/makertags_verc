import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { FirebaseStorageService } from '../../../services/firebase-storage.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { IArtDoc } from '../../../domaine/entities/art';
import { AuthService } from '../../../services/auth.service';
import { IReview } from '../../../domaine/entities/review';
import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'maker-tags-add-review',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule,NzCheckboxModule,NzRateModule,NzButtonModule,FormsModule,NzInputModule,NzUploadModule ],
  templateUrl: './add-review.component.html',
  styleUrl: './add-review.component.css',
})
export class AddReviewComponent {
  name = '';
  review = '';
  constructor(
     @Inject(PLATFORM_ID) private platformId: any,
   private modalRef: NzModalRef, private nzMessageService:NzMessageService, private authService:AuthService){
      
    }

  arts_thumbnails: NzUploadFile[] =  [
  ];
  previewImage: string | undefined = '';
  previewVisible = false;

   artDoc!:IArtDoc;

  ngOnInit(): void {
    
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.artDoc = this.modalRef?.getConfig()?.nzData?.artDOc;
  }
  get currentUser():any{
    const currentUser = this.authService.getCurrentUser();
    return currentUser; 
  }

  handlePreview =  (file: NzUploadFile): void => {
    // if (!file.url && !file.preview) {
    //   file.preview = await getBase64(file.originFileObj!);
    // }
    this.previewImage = file.url
    this.previewVisible = true;
  };
  accepted = false;
  rate:number = 0;
  beforeUploadList = (file: NzUploadFile) =>{
    // if (!file || (file.type !== 'image/png' && file.type !== 'image/jpeg')) {
    //   this.nzMessageService.error('You can only upload PNG or JPEG files!');
    //   return false; // Prevent upload
    // }
  
    // const filePath = `arts_user_` + this.currentUser.uid
  
    // this.firebaseStorageService.uploadFile(file, filePath)
    //   .then((snapshot) => {
    //     return getDownloadURL(snapshot.ref);
    //   })
    //   .then((downloadURL) => {        
    //     // Reassign fileList
    //     this.arts_thumbnails = [...this.arts_thumbnails, { uid: uniqueId(), name: file.name, status: 'done', url: downloadURL }];
    //   })
    //   .catch(error => {
    //     this.nzMessageService.error('Upload failed');
    //   });
  
    // return false; // Prevent default upload behavior
  }
  submitReview(reviewFrom:any){

    if(reviewFrom.invalid){
      this.nzMessageService.error('Please fill all required fields');
      return;
    }
    const review:IReview = {
      user_id: this.currentUser.uid,
      user_name: this.name,
      comment: this.review,
      rate: this.rate,
      user_arts: this.arts_thumbnails.map(art => art.url).filter((url): url is string => url !== undefined),
      created_at: new Date()
    }

 
      if(review?.rate && review?.rate > 0 && this.name.length){
        const initReviews = this.artDoc?.reviews ? this.artDoc?.reviews : []
        const reviews = [...initReviews, review];
        this.artDoc = Object.assign( this.artDoc, {reviews: reviews})
        this.saveArt();
      }else{
        this.nzMessageService.error('Please fill all required fields');
      }

  
  }

  
  saveArt(){
    // if(this.artDoc)
      // this.firebaseStorageService.getDocByiD(this.artDoc.id).pipe(take(1)).subscribe((artDoc)=>{
      //   if(artDoc?.reviews?.find((el:any)=> el.user_arts = this.currentUser.uid)){
      //     this.nzMessageService.error('You have already reviewed this art');
      //     return;
      //   }
      //   if(artDoc){
      //     // this.firebaseStorageService.updateArtDocReviews(this.artDoc).pipe(take(1)).subscribe((resp)=>{
      //     //   this.nzMessageService.success('Thank you for your review');
      //     //   this.modalRef.close();
      //     //    if (isPlatformBrowser(this.platformId)) {
      //     //     window.location.reload();
      //     //    }
           
      //     // })
      //   }
      // })

  }
}
