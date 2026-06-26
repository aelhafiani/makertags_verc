import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboarLayoutdComponent } from './dashboard-layout.component';

describe('DashboardComponent', () => {
  let component: DashboarLayoutdComponent;
  let fixture: ComponentFixture<DashboarLayoutdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboarLayoutdComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboarLayoutdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
