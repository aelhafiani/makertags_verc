const admin = require('firebase-admin');
const sharp = require('sharp');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      "project_id": process.env.FIREBASE_PROJECT_ID,
      "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: 'gs://artmaker-8a799.appspot.com', // Replace with your Firebase storage bucket
  });
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://app.gifttags.com', // Adjust the origin if necessary
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', 
    'Access-Control-Allow-Methods': 'POST',
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
        // Parse the request body (Netlify uses event.body as a string)
        const body = JSON.parse(event.body);
        const uid = body.uid;
   
        // Check if the user's email is verified
        const userRecord = await admin.auth().getUser(uid);
        if (!userRecord.emailVerified) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Email not verified' }),
          };
        }
      const fabricCanvasData = body.dataURL;
      const resolution = body.resolution; // '90dpi' or '300dpi'
      const transparent = body.transparent; // Transparency option (true/false)

      const sizeFromReq = body.size.split('x');
      const widthInches = parseFloat(sizeFromReq[0]);
      const heightInches = parseFloat(sizeFromReq[1]);

      // Convert resolution to pixels per inch (ppi)
      const dpi = resolution === '300dpi' ? 300 : 90;
      const widthPixels = widthInches * dpi;
      const heightPixels = heightInches * dpi;
      const imageBuffer = Buffer.from(await fetch(fabricCanvasData).then(res => res.arrayBuffer()));

      // Generate the PNG image using sharp with the requested resolution
      let image = sharp(imageBuffer).resize(widthPixels, heightPixels);

      // Handle transparency option
      console.log('transparent:', transparent);
      if (transparent) {
        image = image.png({ compressionLevel: 9, adaptiveFiltering: true });
      } else {
        // No transparency, assume white background for PNG
        image = image.flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } });
      }

      // Convert image to PNG format
      const pngBuffer = await image.toBuffer();

      // Save the image to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `imagesExport/${Date.now()}.png`; // Save as PNG
      const file = bucket.file(fileName);
      const token = Date.now();
      await file.save(pngBuffer, {
        contentType: 'image/png', // Set content type as PNG
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      });

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url }),
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
