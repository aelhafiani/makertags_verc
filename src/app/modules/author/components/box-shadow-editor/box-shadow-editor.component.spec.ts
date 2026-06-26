import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoxShadowEditorComponent } from './box-shadow-editor.component';

describe('BoxShadowEditorComponent', () => {
  let component: BoxShadowEditorComponent;
  let fixture: ComponentFixture<BoxShadowEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxShadowEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BoxShadowEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
