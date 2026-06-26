import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EditorAnnouncerService {
  private readonly messagesSubject = new Subject<string>();
  readonly messages$ = this.messagesSubject.asObservable();

  announce(message: string): void {
    this.messagesSubject.next(message);
  }
}

