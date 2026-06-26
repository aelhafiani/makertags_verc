const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
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

const db = admin.firestore();

// Helper function to delete user data from Firestore
async function deleteUserData(userId) {
  try {
    // Reference to the user document in Firestore (adjust the path as needed)
    const userRef = db.collection('users').doc(userId);

    // Delete user data
    await userRef.delete();

    return true;
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw new Error("Failed to delete user data.");
  }
}

exports.handler = async (event) => {
  try {
    // Ensure this is a POST request
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    // Parse the incoming request body
    const { user_id } = JSON.parse(event.body);

    if (!user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing user_id in request body." }),
      };
    }

    // Delete the user data
    await deleteUserData(user_id);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Data deleted successfully." }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
