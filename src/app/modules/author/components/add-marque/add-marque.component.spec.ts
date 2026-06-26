import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMarqueComponent } from './add-marque.component';

describe('AddMarqueComponent', () => {
  let component: AddMarqueComponent;
  let fixture: ComponentFixture<AddMarqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMarqueComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddMarqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
