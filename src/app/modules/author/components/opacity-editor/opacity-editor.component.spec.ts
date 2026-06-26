import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpacityEditorComponent } from './opacity-editor.component';

describe('OpacityEditorComponent', () => {
  let component: OpacityEditorComponent;
  let fixture: ComponentFixture<OpacityEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpacityEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OpacityEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
