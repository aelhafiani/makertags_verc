import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextStyleComponent } from './text-style.component';

describe('TextStyleComponent', () => {
  let component: TextStyleComponent;
  let fixture: ComponentFixture<TextStyleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextStyleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextStyleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
