import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key required for auth + storage
);

const ALLOWED_ORIGINS = new Set([
  'https://tagprintly.com',
  'https://makertags.netlify.app'
]);

export const handler = async (event, context) => {
  const requestOrigin = event.headers?.origin ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : 'https://tagprintly.com';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      // Parse the request body
      const body = JSON.parse(event.body);
      const uid = body.uid;

      // Fetch the user record from Supabase
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(uid);

      if (userError || !user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }
// Not Delete This Code Should be Used Later
      // if (!user.user.email_confirmed_at) {
      //   return {
      //     statusCode: 403,
      //     headers,
      //     body: JSON.stringify({ error: 'Email not verified' }),
      //   };
      // }

      // Extract request params
      const fabricCanvasData = body.dataURL;
      const resolution = body.resolution; // '90dpi' or '300dpi'
      const transparent = body.transparent; // true/false

      const sizeFromReq = body.size.split('x');
      const widthInches = parseFloat(sizeFromReq[0]);
      const heightInches = parseFloat(sizeFromReq[1]);

      // Convert resolution to pixels
      const dpi = resolution === '300dpi' ? 300 : 90;
      const widthPixels = widthInches * dpi;
      const heightPixels = heightInches * dpi;

      const imageBuffer = Buffer.from(await fetch(fabricCanvasData).then(res => res.arrayBuffer()));

      // Generate PNG with Sharp
      let image = sharp(imageBuffer).resize(widthPixels, heightPixels);

      if (transparent) {
        image = image.png({ compressionLevel: 9, adaptiveFiltering: true });
      } else {
        // Flatten with white background
        image = image.flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } }).png();
      }

      const pngBuffer = await image.toBuffer();

      // Save to Supabase Storage
      const fileName = `pngsExport-${uid}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('images-exports') // your bucket name
        .upload(fileName, pngBuffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading to Supabase Storage:', uploadError);
        return {
          statusCode: 500,
          headers,
          body: 'Error uploading to storage',
        };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images-exports')
        .getPublicUrl(fileName);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: publicUrl }),
      };
    } catch (error) {
      console.error('Error generating PNG:', error);
      return {
        statusCode: 500,
        headers,
        body: 'Error generating PNG',
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: 'Method Not Allowed',
  };
};
