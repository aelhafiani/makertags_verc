import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ENVIRONMENTS } from '../../../core/app.tokens';

@Injectable({
    providedIn: 'root',
})
export class SiteConfigService {
    constructor(@Inject(ENVIRONMENTS) private env: any,private httpCLientService:HttpClient,private nzMessage:NzMessageService) {}


    generateSitemap(){
        const url = `${this.env.hostServer}/.netlify/functions/generate-sitemap`;
    
        this.httpCLientService.get(url).subscribe((res:any)=>{
          this.nzMessage.success('Sitemap generated successfully');
        });
      
  }
}