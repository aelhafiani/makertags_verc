import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputGroupComponent, NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslocoModule } from '@jsverse/transloco';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { IQuestion } from '../../shared/domaine/entities/question';
import { nanoid } from 'nanoid';


@Component({
  selector: 'maker-tags-questions-page',
  standalone: true,
  imports: [CommonModule,NzFormModule,NzInputModule,ReactiveFormsModule,FormsModule,NzCollapseModule,RouterModule,TranslocoModule],
  templateUrl: './questions-page.component.html',
  styleUrl: './questions-page.component.css',
})
export class QuestionsPageComponent {
  questionText = '';
  questions:IQuestion[] = [];
  faqSchemaJsonLd: SafeHtml | null = null;

  constructor( private sanitizer: DomSanitizer,private firebaseService:FirebaseStorageService, private nzMessageService:NzMessageService, private router:ActivatedRoute) { 
    const questions = this.router.snapshot.data['questions'];
    this.questions = questions;
    this.generateFAQSchemaJSON();  
  }
  faqs = [] as any;
  

  
  generateFAQSchemaJSON() {
    const jsonLD = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": this.questions.map((faq: any) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer.replace(/<[^>]*>/g, '')
        }
      }))
    };
  
    const script = `<script type="application/ld+json">${JSON.stringify(jsonLD)}</script>`;
    this.faqSchemaJsonLd = this.sanitizer.bypassSecurityTrustHtml(script);
  }
  searchQuery = '';
  
  

  filteredFAQs = [...this.faqs];

  filterQuestions() {
    this.filteredFAQs = this.faqs.filter((faq:any) => 
      faq.question.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      faq.answer.text.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }
  addQuestion(){
   const question:IQuestion = {
    id:nanoid(),
    question:this.questionText,
    answer:'',
    expanded:false
   }

  //  this.firebaseService.addQuestion(question).subscribe(
  //   (res)=>{
  //   this.nzMessageService.success('Question added successfully we will review it and add it to the list with the answer');
  //  })
  }
}
