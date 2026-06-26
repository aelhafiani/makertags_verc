import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddElementsComponent } from './add-elements.component';

describe('AddElementsComponent', () => {
  let component: AddElementsComponent;
  let fixture: ComponentFixture<AddElementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddElementsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddElementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
