import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needs service role for user management + storage
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
      const bleed = body.bleed; // numeric bleed in inches, or 0

      const sizeFromReq = body.size.split('x');
      const widthInches = parseFloat(sizeFromReq[0]);
      const heightInches = parseFloat(sizeFromReq[1]);

      // Convert resolution to pixels per inch
      const dpi = resolution === '300dpi' ? 300 : 90;
      const widthPixels = widthInches * dpi;
      const heightPixels = heightInches * dpi;
      const imageBuffer = Buffer.from(await fetch(fabricCanvasData).then(res => res.arrayBuffer()));

      // Generate JPEG with sharp
      let image = sharp(imageBuffer).resize(widthPixels, heightPixels);

      if (bleed) {
        const bleedInPixels = Math.round(dpi * bleed);
        image = image.extend({
          top: bleedInPixels,
          bottom: bleedInPixels,
          left: bleedInPixels,
          right: bleedInPixels,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        });
      }

      const jpegBuffer = await image.jpeg({ quality: 90 }).toBuffer();

      // Save to Supabase Storage
      const fileName = `jpegsExport-${uid}/${Date.now()}.jpeg`;
      const { error: uploadError } = await supabase.storage
        .from('images-exports') 
        .upload(fileName, jpegBuffer, {
          contentType: 'image/jpeg',
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
      console.error('Error generating JPEG:', error);
      return {
        statusCode: 500,
        headers,
        body: 'Error generating JPEG',
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: 'Method Not Allowed',
  };
};
