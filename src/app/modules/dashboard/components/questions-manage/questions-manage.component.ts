// questions-manage.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { IQuestion } from '../../../shared/domaine/entities/question';
import { FirebaseStorageService } from '../../../shared/services/firebase-storage.service';
import { ArtDocsService } from '../../../shared/services/art-docs.service';

@Component({
  selector: 'maker-tags-questions-manage',
  standalone: true,
  imports: [
    CommonModule,
    NzListModule,
    NzInputModule,
    FormsModule,
    NzButtonModule
  ],
  templateUrl: './questions-manage.component.html',
  styleUrl: './questions-manage.component.css',
})
export class QuestionsManageComponent {
  questions: IQuestion[] = [];
  editedAnswers: { [key: string]: string } = {};

  constructor(
    private artDocsService: ArtDocsService,
    private firebaseService: FirebaseStorageService,
    private message: NzMessageService
  ) { }

  ngOnInit() {
    this.loadQuestions();
  }

  loadQuestions() {
    this.artDocsService.getQuestions().subscribe({
      next: (snapshot) => {
        this.questions = snapshot.map((doc:any) => {
          const question = doc as IQuestion;
          // Initialize editedAnswers with existing answers
          this.editedAnswers[question.id] = question.answer;
          return question;
        });
      },
      error: (err) => {
        this.message.error('Error loading questions');
      }
    });
  }

  deleteQuestion(questionId: string) {
    // this.firebaseService.deleteQuestion(questionId).subscribe({
    //   next: () => {
    //     this.questions = this.questions.filter(q => q.id !== questionId);
    //     this.message.success('Question deleted successfully');
    //   },
    //   error: () => {
    //     this.message.error('Error deleting question');
    //   }
    // });
  }

  updateAnswer(question: IQuestion) {
    if (!this.editedAnswers[question.id]) return;

    const updatedQuestion: IQuestion = {
      ...question,
      answer: this.editedAnswers[question.id]
    };

    // this.firebaseService.updateQuestion(updatedQuestion).subscribe({
    //   next: () => {
    //     this.message.success('Answer updated successfully');
    //     this.loadQuestions(); // Refresh the list
    //   },
    //   error: () => {
    //     this.message.error('Error updating answer');
    //   }
    // });
  }
}
