import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthorLayoutComponent } from './author.component';

describe('AuthorComponent', () => {
  let component: AuthorLayoutComponent;
  let fixture: ComponentFixture<AuthorLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorLayoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
