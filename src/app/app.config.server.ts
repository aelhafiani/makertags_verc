import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { TRANSLOCO_LOADER } from '@jsverse/transloco';
import { TranslocoServerLoader } from './core/transloco-loader.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes),
    // Replace HTTP loader with filesystem loader — avoids GET /assets/i18n/*.json
    // requests that fail in serverless SSR (no local HTTP server available)
    { provide: TRANSLOCO_LOADER, useClass: TranslocoServerLoader },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
