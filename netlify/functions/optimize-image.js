const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    const { url, w = 400, q = 80, f = 'webp' } = event.queryStringParameters;

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL parameter is required' })
      };
    }

    // Fetch image from Firebase Storage
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize image with sharp
    let image = sharp(buffer);

    // Resize if width specified
    if (w) {
      image = image.resize(parseInt(w), null, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert format and optimize
    const quality = parseInt(q);
    switch (f) {
      case 'webp':
        image = image.webp({ quality });
        break;
      case 'avif':
        image = image.avif({ quality });
        break;
      case 'jpeg':
      case 'jpg':
        image = image.jpeg({ quality, progressive: true });
        break;
      default:
        image = image.webp({ quality });
    }

    const optimizedBuffer = await image.toBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': `image/${f}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': optimizedBuffer.length
      },
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Image optimization error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
