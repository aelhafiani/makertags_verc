const path = require('path');
const fs = require('fs');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function parseBody(req) {
  const contentType = req.headers['content-type'] || '';
  const rawBody = await readBody(req);

  if (!rawBody) return '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return rawBody;
    }
  }

  return rawBody;
}

module.exports = async function handler(req, res) {
  const slug = Array.isArray(req.query?.slug)
    ? req.query.slug.join('/')
    : req.query?.slug || '';

  if (!slug) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  const functionPath = path.join(__dirname, '..', 'netlify', 'functions', `${slug}.js`);
  if (!fs.existsSync(functionPath)) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: `Function not found: ${slug}` }));
    return;
  }

  const mod = require(functionPath);
  const netlifyHandler = mod.handler || mod.default || mod;

  const body = await parseBody(req);
  const event = {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: req.headers,
    httpMethod: req.method,
    isBase64Encoded: false,
    path: req.url,
    queryStringParameters: req.query || {},
    multiValueQueryStringParameters: req.query || {},
    rawBody: typeof body === 'string' ? body : JSON.stringify(body),
    requestContext: {},
  };

  const result = await netlifyHandler(event, {});
  if (!result || typeof result !== 'object') {
    res.statusCode = 200;
    res.end('');
    return;
  }

  res.statusCode = result.statusCode || 200;
  Object.entries(result.headers || {}).forEach(([key, value]) => {
    if (value) res.setHeader(key, value);
  });
  res.end(result.body || '');
};
