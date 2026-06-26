// Vercel serverless function — exécute le bundle Angular SSR
// Les fichiers du bundle sont inclus via `includeFiles` dans vercel.json

let _reqHandler = null;

async function getHandler() {
  if (!_reqHandler) {
    const mod = await import('../dist/makertags/server/server.mjs');
    _reqHandler = mod.reqHandler;
  }
  return _reqHandler;
}

module.exports = async function handler(req, res) {
  const reqHandler = await getHandler();
  return reqHandler(req, res, (err) => {
    if (!res.writableEnded) {
      res.statusCode = err ? 500 : 404;
      res.end(err ? 'Internal Server Error' : 'Not Found');
    }
  });
};
