import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuestionsManageComponent } from './questions-manage.component';

describe('QuestionsManageComponent', () => {
  let component: QuestionsManageComponent;
  let fixture: ComponentFixture<QuestionsManageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionsManageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionsManageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
