const admin = require('firebase-admin');
const { PDFDocument, rgb } = require('pdf-lib');

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
  // Manually add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://app.gifttags.com', // Your allowed origin
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Include Authorization
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS method for CORS preflight
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
      const savePaper = body.savePaper;

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([842, 595]); // A4 size in points

      // Convert the Fabric.js canvas data to a data URL
      const imageBytes = await fetch(fabricCanvasData).then(res => res.arrayBuffer());
      const jpgImage = await pdfDoc.embedJpg(imageBytes);

      const sizeFromReq = body.size.split('x');
      const bleed = body.bleed * 72; // Bleed in points
      const imageWidth = sizeFromReq[0] * 72;
      const imageHeight = sizeFromReq[1] * 72;
      const positions = savePaper
        ? calculatePositions(imageWidth, imageHeight, bleed)
        : [[(842 - imageWidth) / 2, (595 - imageHeight) / 2]];

      positions.forEach(([x, y]) => {
        page.drawImage(jpgImage, { x, y, width: imageWidth, height: imageHeight });

        if (body.marks) {
          drawCutMarks(page, positions, imageWidth, imageHeight, bleed);
        }
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();

      // Save PDF to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `pdfs/${Date.now()}.pdf`;
      const file = bucket.file(fileName);
      const token = Date.now();
      await file.save(Buffer.from(pdfBytes), {
        contentType: 'application/pdf',
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
      console.error('Error generating PDF:', error);
      return {
        statusCode: 500,
        headers,
        body: 'Error generating PDF',
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: 'Method Not Allowed',
  };
};

// Functions to calculate positions and draw cut marks
function calculatePositions(imageWidth, imageHeight, bleed, pageWidth = 842, pageHeight = 595) {
  const positions = [];
  let y = bleed;

  while (y + imageHeight + bleed <= pageHeight) {
    let x = bleed;
    while (x + imageWidth + bleed <= pageWidth) {
      positions.push([x, pageHeight - y - imageHeight - bleed]);
      x += imageWidth + bleed;
    }
    y += imageHeight + bleed;
  }

  return positions;
}

function drawCutMarks(page, positions, imageWidth, imageHeight, bleed, markLength = 18, markThickness = 0.5) {
  const markStart = bleed - markLength / 2;
  const markEnd = bleed + markLength / 2;

  positions.forEach(([x, y]) => {
    page.drawLine({
      start: { x: x + markStart, y: y + markStart },
      end: { x: x + markEnd, y: y + markStart },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: x + markStart, y: y + markStart },
      end: { x: x + markStart, y: y + markEnd },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });

    // Top right
    page.drawLine({
      start: { x: x + imageWidth - markStart, y: y + markStart },
      end: { x: x + imageWidth - markEnd, y: y + markStart },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: x + imageWidth - markStart, y: y + markStart },
      end: { x: x + imageWidth - markStart, y: y + markEnd },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });

    // Bottom left
    page.drawLine({
      start: { x: x + markStart, y: y + imageHeight - markStart },
      end: { x: x + markEnd, y: y + imageHeight - markStart },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: x + markStart, y: y + imageHeight - markStart },
      end: { x: x + markStart, y: y + imageHeight - markEnd },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });

    // Bottom right
    page.drawLine({
      start: { x: x + imageWidth - markStart, y: y + imageHeight - markStart },
      end: { x: x + imageWidth - markEnd, y: y + imageHeight - markStart },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: x + imageWidth - markStart, y: y + imageHeight - markStart },
      end: { x: x + imageWidth - markStart, y: y + imageHeight - markEnd },
      thickness: markThickness,
      color: rgb(0, 0, 0),
    });
  });
}
