import { isPlatformBrowser } from '@angular/common';
import { HttpEvent, HttpHandlerFn, HttpHeaders, HttpRequest } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

import { Observable } from 'rxjs';


export function mainInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const platformId = inject(PLATFORM_ID);



  // Only try to read localStorage on the browser
  let headers = req.headers;
  if (isPlatformBrowser(platformId)) {
    const tokenKey = localStorage.getItem('token');
    if (tokenKey) {
      headers = headers.set('Authorization', `Bearer ${tokenKey}`);
    }
  }

  const newReq = req.clone({ headers });
  return next(newReq);
}