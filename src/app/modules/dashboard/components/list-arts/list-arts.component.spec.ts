import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListArtsComponent } from './list-arts.component';

describe('ListArtsComponent', () => {
  let component: ListArtsComponent;
  let fixture: ComponentFixture<ListArtsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListArtsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListArtsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
