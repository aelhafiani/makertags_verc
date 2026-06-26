import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleGalleryComponent } from './simple-gallery.component';

describe('SimpleGalleryComponent', () => {
  let component: SimpleGalleryComponent;
  let fixture: ComponentFixture<SimpleGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleGalleryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
