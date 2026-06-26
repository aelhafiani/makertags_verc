import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImagesEditorComponent } from './images-editor.component';

describe('ImagesEditorComponent', () => {
  let component: ImagesEditorComponent;
  let fixture: ComponentFixture<ImagesEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagesEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagesEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
