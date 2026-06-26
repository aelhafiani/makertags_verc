const admin = require('firebase-admin');

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
  // Check if the HTTP method is POST
  if (event.httpMethod === 'POST') {
    try {
      // Parse the body to extract the uid
      const { uid } = JSON.parse(event.body);

      // Check if uid was provided
      if (!uid) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'User ID is required' }),
        };
      }

      // Update the user by disabling them
      await admin.auth().updateUser(uid, {
        disabled: false,
      });

      console.log('Successfully updated user to disabled');
      
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'User disabled successfully' }),
      };
    } catch (error) {
      console.error('Error updating user:', error);

      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error updating user', error: error.message }),
      };
    }
  } else {
    // If the method is not POST, return Method Not Allowed
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }
};
