import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextEditorSizeComponent } from './text-editor-size.component';

describe('TextEditorSizeComponent', () => {
  let component: TextEditorSizeComponent;
  let fixture: ComponentFixture<TextEditorSizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextEditorSizeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextEditorSizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
