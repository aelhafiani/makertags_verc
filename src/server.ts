import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const angularApp = new AngularNodeAppEngine();

/**
 * Express app — pour les déploiements non-serverless (local, VPS, etc.)
 * Les fichiers statiques sont servis directement depuis le bundle browser.
 */
export function app(): express.Express {
  const server = express();

  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  server.use(
    '**',
    createNodeRequestHandler(async (req, res, next) => {
      const response = await angularApp.handle(req);
      if (response) {
        await writeResponseToNodeResponse(response, res);
      } else {
        next();
      }
    }),
  );

  return server;
}

/**
 * Handler exporté pour les plateformes serverless (Vercel, AWS Lambda, etc.)
 * Les fichiers statiques sont servis par le CDN de la plateforme.
 */
export const reqHandler = createNodeRequestHandler(async (req, res, next) => {
  const response = await angularApp.handle(req);
  if (response) {
    await writeResponseToNodeResponse(response, res);
  } else {
    next();
  }
});

// Démarrage standalone (non-serverless)
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app().listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}
