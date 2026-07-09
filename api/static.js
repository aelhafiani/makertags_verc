const fs = require('fs');
const path = require('path');

function contentTypeFor(ext) {
  const map = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.map': 'application/json',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json'
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

module.exports = async function handler(req, res) {
  try {
    // Extract pathname (strip leading slash)
    const urlPath = decodeURIComponent(req.url.split('?')[0] || '').replace(/^\/+/, '');
    if (!urlPath) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const projectRoot = path.resolve(__dirname, '..');
    const filePath = path.join(projectRoot, 'dist', 'makertags', 'browser', urlPath);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.setHeader('Content-Type', contentTypeFor(ext));
    // Stream file
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  } catch (err) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
