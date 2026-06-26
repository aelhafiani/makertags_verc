const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (Ensure it's initialized only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: 'gs://artmaker-8a799.appspot.com',
  });
}

const db = admin.firestore();
const BASE_URL = 'https://gifttags.com';

exports.handler = async function () {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/xml',
  };

  try {
    const artsSnapshot = await db.collection('art_docs')
  .where('status', '==', 'published')
  .get();
    const dynamicUrls = artsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const title = encodeURIComponent(data?.title?.replace(/\s+/g, '-') || 'untitled');
      const updatedAt = data?.updated_at?.toDate().toISOString() || new Date().toISOString();

      return {
        loc: `${BASE_URL}/tags/${title}/${doc.id}`,
        lastmod: updatedAt,
      };
    });

    const staticUrls = [
      { loc: `${BASE_URL}/tags`, lastmod: '2024-12-16' },
      { loc: `${BASE_URL}/about`, lastmod: '2024-12-16' },
      { loc: `${BASE_URL}/contact`, lastmod: '2024-12-16' },
      { loc: `${BASE_URL}/questions`, lastmod: '2025-02-10' }
    ];

    const allUrls = [...staticUrls, ...dynamicUrls];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${allUrls
        .map(
          (url) => `  
        <url>
          <loc>${url.loc}</loc>
          <lastmod>${url.lastmod}</lastmod>
        </url>`
        )
        .join('')}
      </urlset>`;

    // Determine file storage location
    const isProduction = process.env.NODE_ENV === 'production';
    const basePath = isProduction ? '/' : path.join(__dirname, '../../src'); 
    const filePath = path.join(basePath, 'sitemap.xml');

    // Ensure directory exists (for local environment)
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    // Write to file (only in environments where this is needed)
    fs.writeFileSync(filePath, sitemap, 'utf8');

    console.log(`Sitemap saved at: ${filePath}`);

    // 🚀 Option 1: Return XML directly (best for APIs)
    return {
      statusCode: 200,
      headers,
      body: sitemap, // Send the sitemap as a response
    };

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error generating sitemap', error: error.message }),
    };
  }
};
