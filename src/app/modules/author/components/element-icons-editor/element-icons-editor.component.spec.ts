import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementIconsEditorComponent } from './element-icons-editor.component';

describe('ElementIconsEditorComponent', () => {
  let component: ElementIconsEditorComponent;
  let fixture: ComponentFixture<ElementIconsEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElementIconsEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ElementIconsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
