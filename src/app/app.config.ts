import { ApplicationConfig, importProvidersFrom, isDevMode } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './core/transloco-http-loader.service';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgxsModule } from '@ngxs/store';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';

import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';

import { environment } from '../environments/environment';
import { ENVIRONMENTS } from './core/app.tokens';
import { mainInterceptor } from './core/interceptor';

import { appRoutes } from './app.routes';

// Your NGXS States
import { NewArtState } from './modules/shared/domaine/state/new-art/new-art.reducers';
import { CanvaPropsState } from './modules/shared/domaine/state/canva-props/canva-props.reducers';
import { ArtDocState } from './modules/shared/domaine/state/art-doc/art-doc.reducer';
import { UserSessionState } from './modules/shared/domaine/state/auth/user-session-state.reducer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { provideServiceWorker } from '@angular/service-worker';
import { EditorShellState } from './modules/author/services/editor-shell.state';
import { BackgroundState } from './modules/author/services/background.state';


export const appConfig: ApplicationConfig = {
  
  providers: [
     // Angular
    // provideClientHydration(withEventReplay()),
      
   
    provideHttpClient(withInterceptors([mainInterceptor]), withFetch()),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
       withInMemoryScrolling({
        scrollPositionRestoration: 'enabled', // or 'top' for always scrolling to the top
        anchorScrolling: 'enabled', // Optional: enables scrolling to fragment anchors
      })
    ),

    // ImportModules using importProvidersFrom (for standalone)
    importProvidersFrom(
      BrowserAnimationsModule,
      NzModalModule,
      NzMessageModule,
      NzIconModule,

      NgxsModule.forRoot([
        NewArtState,
        CanvaPropsState,
        ArtDocState,
        UserSessionState,
        EditorShellState,
        BackgroundState,
      ]),
      NgxsStoragePluginModule.forRoot({
        keys: ['newArtState', 'CanvaPropsState', 'ArtDocState','UserSessionState']
      }),
      NgxsReduxDevtoolsPluginModule.forRoot({
        disabled: environment.production
      }),
    ),
     { provide: ENVIRONMENTS, useValue: environment },
     provideTransloco({
      config: {
        availableLangs: ['en', 'es', 'de', 'fr'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: TranslocoHttpLoader,
    }),
     provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),

     provideClientHydration(withEventReplay(), withIncrementalHydration())
  ]
};
