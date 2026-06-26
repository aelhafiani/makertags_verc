import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextSpacingEditorComponent } from './text-spacing-editor.component';

describe('TextSpacingEditorComponent', () => {
  let component: TextSpacingEditorComponent;
  let fixture: ComponentFixture<TextSpacingEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextSpacingEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextSpacingEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
