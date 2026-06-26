import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuperpositionEditorComponent } from './superposition-editor.component';

describe('SuperpositionEditorComponent', () => {
  let component: SuperpositionEditorComponent;
  let fixture: ComponentFixture<SuperpositionEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperpositionEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperpositionEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
