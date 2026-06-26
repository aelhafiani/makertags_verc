import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArtDocComponent } from './art-doc.component';

describe('ArtDocComponent', () => {
  let component: ArtDocComponent;
  let fixture: ComponentFixture<ArtDocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtDocComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
