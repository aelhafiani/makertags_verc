import { NgModule } from '@angular/core';
import { ENVIRONMENTS } from './app.tokens';
import { environment } from '../../environments/environment';

@NgModule({
    providers: [
      { provide: ENVIRONMENTS, useValue: environment },
    ]
  })
export class CoreModule {}