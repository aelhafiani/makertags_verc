import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorEditorTextComponent } from './color-editor-text.component';

describe('ColorEditorComponent', () => {
  let component: ColorEditorTextComponent;
  let fixture: ComponentFixture<ColorEditorTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorEditorTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColorEditorTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
