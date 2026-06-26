import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ENVIRONMENTS } from '../../../../core/app.tokens';

@Component({
  selector: 'maker-tags-site-config',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './site-config.component.html',
  styleUrl: './site-config.component.css',
})
export class SiteConfigComponent {
  constructor(@Inject(ENVIRONMENTS) private env: any,private httpCLientService:HttpClient,private nzMessage:NzMessageService) {}

  generateSitemap(){
        const url = `${this.env.hostServer}/.netlify/functions/generate-sitemap`;
    
        this.httpCLientService.get(url).subscribe((res:any)=>{
          this.nzMessage.success('Sitemap generated successfully');
        });
      
  }


}
