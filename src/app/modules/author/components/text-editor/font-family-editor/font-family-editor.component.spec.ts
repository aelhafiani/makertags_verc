import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontFamilyEditorComponent } from './font-family-editor.component';

describe('FontFamilyEditorComponent', () => {
  let component: FontFamilyEditorComponent;
  let fixture: ComponentFixture<FontFamilyEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FontFamilyEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FontFamilyEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
