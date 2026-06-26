import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtpRegisterComponent } from './otp-register-complete.component';

describe('OtpRegisterComponent', () => {
  let component: OtpRegisterComponent;
  let fixture: ComponentFixture<OtpRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtpRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtpRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
