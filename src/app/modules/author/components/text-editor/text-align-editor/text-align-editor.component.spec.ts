import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextAlignEditorComponent } from './text-align-editor.component';

describe('TextAlignEditorComponent', () => {
  let component: TextAlignEditorComponent;
  let fixture: ComponentFixture<TextAlignEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextAlignEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextAlignEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
