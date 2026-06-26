const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: 'gs://artmaker-8a799.appspot.com', // Replace with your Firebase storage bucket
  });
}

// Global CORS handler
const handleCORS = (response, statusCode = 200) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:4200', // Your allowed origin
      'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Include Authorization
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(response),
  };
};

exports.handler = async (event) => {
  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS({ message: 'CORS preflight successful' });
  }

  if (event.httpMethod === 'POST') {
    try {
      const { uid } = JSON.parse(event.body);

      if (!uid) {
        return handleCORS({ message: 'User ID is required' }, 400);
      }

      // Generate custom token
      const token = await admin.auth().createCustomToken(uid);

      return handleCORS({
        message: 'Token generated successfully',
        token,
      });
    } catch (error) {
      console.error('Error creating token:', error);

      return handleCORS(
        { message: 'Error creating token', error: error.message },
        500
      );
    }
  }

  return handleCORS({ message: 'Method Not Allowed' }, 405);
};
