import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtpFormSupComponent } from './otp-form-sup.component';

describe('OtpFormSupComponent', () => {
  let component: OtpFormSupComponent;
  let fixture: ComponentFixture<OtpFormSupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtpFormSupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtpFormSupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
