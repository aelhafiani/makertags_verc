const FAL_API_KEY = process.env.FAL_API_KEY || '4ba42982-2aca-430b-a72f-5739c44ec0d7:6588bc1f6aaa9ae97dc25b67561fedfb';
const FAL_KONTEXT_QUEUE = 'https://queue.fal.run/fal-ai/nano-banana-2/edit';
const FAL_SCHNELL_QUEUE = 'https://queue.fal.run/fal-ai/flux/schnell';
const FAL_UPLOAD        = 'https://rest.alpha.fal.ai/storage/upload/initiate';

const ALLOWED_ORIGINS = new Set([
  'https://tagprintly.com',
  'https://makertags.netlify.app',
  'http://localhost:4200',
]);

const IMAGE_SIZES = {
  '9:16': { width: 1080, height: 1920 },
  '2:3':  { width: 1000, height: 1500 },
  '4:5':  { width: 1000, height: 1250 },
  '1:1':  { width: 1024, height: 1024 },
};

export const handler = async (event) => {
  const origin = event.headers?.origin ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://tagprintly.com';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { ratio = '2:3', occasion = '', title = '', subtitle = '', canvasImageBase64 = '', mockupType = 'gift-tag', openedCardBase64 = '' } = JSON.parse(event.body || '{}');

    const imageSize = IMAGE_SIZES[ratio] ?? IMAGE_SIZES['2:3'];

    // ── 1. Upload canvas image to fal.ai storage ─────────────────────────────
    let tagImageUrl = null;
    if (canvasImageBase64) {
      const base64Data = canvasImageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const initiateRes = await fetch(FAL_UPLOAD, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_name: 'tag.png', content_type: 'image/png' }),
      });
      const { upload_url, file_url } = await initiateRes.json();

      if (upload_url) {
        await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/png' },
          body: imageBuffer,
        });
        tagImageUrl = file_url;
      }
    }

    // ── 1b. Upload opened card photo (cut-die-card only) ──────────────────────
    let openedCardUrl = null;
    if (mockupType === 'cut-die-card' && openedCardBase64) {
      const isJpeg = openedCardBase64.startsWith('data:image/jpeg');
      const contentType = isJpeg ? 'image/jpeg' : 'image/png';
      const fileName = isJpeg ? 'opened-card.jpg' : 'opened-card.png';
      const base64Data = openedCardBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const initiateRes = await fetch(FAL_UPLOAD, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_name: fileName, content_type: contentType }),
      });
      const { upload_url, file_url } = await initiateRes.json();

      if (upload_url) {
        await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: imageBuffer,
        });
        openedCardUrl = file_url;
      }
    }

    // ── 2. Build prompt ───────────────────────────────────────────────────────
    const occasionPart = occasion ? `${occasion} ` : '';

    let prompt;
    if (mockupType === 'cut-die-card') {
      if (tagImageUrl && openedCardUrl) {
        prompt = `Create an ultra realistic die-cut greeting card product image using the TWO uploaded reference images only.

The first image shows the OPENED (unfolded/flat) version of the card — this is the card design as it appears when fully open.
The second image shows the CLOSED (folded) version of the same card — this is how the card looks when folded shut.

Generate a premium product mockup that perfectly recreates both states of the card.
Reproduce the exact same artwork, colors, typography, illustrations, and layout from the uploaded references without any modification.
Do NOT invent, replace, or add any design elements that are not visible in the uploaded images.

The mockup should show both states naturally — one hand holding the card open showing its full interior design, and the same card closed showing the folded exterior — demonstrating the folding mechanism.

Use realistic hands holding the card naturally.
Soft neutral background (beige fabric or white surface).
Luxury stationery photography style.
Natural lighting, realistic paper texture, soft shadows, and clean elegant composition.

Critical rules:
* Copy the design EXACTLY from the uploaded images. Do not redesign or reimagine anything.
* The opened state must match image 1 exactly.
* The closed state must match image 2 exactly.
* Vertical 9:16 TikTok/Reels composition.
* Ultra detailed realistic product mockup aesthetic.`;
      } else if (tagImageUrl) {
        prompt = `Create an ultra realistic die-cut greeting card product image using the uploaded reference image.

The uploaded image shows the OPENED (unfolded/flat) version of the card — the full interior design.

Generate a premium product mockup showing the card in both its opened and closed states.
Reproduce the exact same artwork, colors, typography, and illustrations from the uploaded reference without any modification.
Do NOT invent or add any design elements that are not in the uploaded image.

Use realistic hands holding the card naturally.
Soft neutral background (beige fabric or white surface).
Luxury stationery photography style.
Natural lighting, realistic paper texture, soft shadows, and clean elegant composition.

Critical rules:
* Copy the design EXACTLY from the uploaded image.
* Do not redesign, reimagine, or add anything.
* Vertical 9:16 TikTok/Reels composition.
* Ultra detailed realistic product mockup aesthetic.`;
      } else {
        prompt = `A clean simple product photo of a die-cut greeting card. Two states shown: one opened (flat, showing the full interior design) and one closed (folded exterior). Hands holding the card naturally. Soft neutral background. Luxury stationery photography style. Natural lighting, realistic paper texture, soft shadows. Vertical 9:16 composition. Ultra detailed realistic product mockup aesthetic.`;
      }
    } else {
      const backgroundStyles = [
        `bright airy room scene with multiple stacked ${occasionPart}gifts in the background, warm bokeh fairy lights, light wooden shelf, pastel gift boxes, natural daylight flooding through a nearby window`,
        `clean white marble surface, single beautifully wrapped ${occasionPart}gift with pink satin ribbon and bow, soft window light from the side, blurred white curtain background, minimal and elegant`,
        `rustic chic scene on a light linen surface, ${occasionPart}gift wrapped in cream paper with raffia twine bow, fresh eucalyptus and dried flowers around, wicker basket blurred in background, warm natural light`,
        `bright feminine shelfie scene, ${occasionPart}gift on a white marble table, pink roses and peonies bouquet blurred behind, gold accents, multiple wrapped gifts in background, bright airy high-key lighting`,
        `cozy bright living room, ${occasionPart}gifts stacked on a white table, soft pink and beige wrapped presents, fairy lights bokeh in background, fresh flowers, flooded with soft natural light`,
      ];
      const chosenBg = backgroundStyles[Math.floor(Math.random() * backgroundStyles.length)];
      prompt = tagImageUrl
        ? `Place this exact gift tag design — preserve every detail of its artwork, colors, text, and shape without any modification — realistically in the foreground of a lifestyle photo. Attach it with natural twine or a satin ribbon to a beautifully wrapped gift. Scene: ${chosenBg}. The wrapping paper must be light pastel — soft white, cream, blush pink or light floral pattern, NOT dark kraft brown. Bright airy soft pastel palette, high-key natural lighting, Pinterest lifestyle photography, photorealistic, shallow depth of field. The tag in the output must look IDENTICAL to the input tag image.`
        : `A bright airy Pinterest-style ${occasionPart}gift wrap scene. ${chosenBg}. Photorealistic, high-key lighting, shallow depth of field.`;
    }

    // ── 3. Submit to fal.ai Queue (returns immediately) ──────────────────────
    const imageUrls = [tagImageUrl, openedCardUrl].filter(Boolean);
    const payload = imageUrls.length
      ? { image_urls: imageUrls, prompt, image_size: imageSize, num_images: 1 }
      : { prompt, image_size: imageSize, num_inference_steps: 4, num_images: 1 };

    const endpoint = FAL_KONTEXT_QUEUE;

    const queueRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!queueRes.ok) {
      const err = await queueRes.text();
      console.error('fal.ai queue error:', err);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI queue submission failed', detail: err }) };
    }

    const queueData = await queueRes.json();
    // Queue response: { request_id, status, response_url, status_url }
    const requestId = queueData.request_id;
    const statusUrl = queueData.status_url;
    const responseUrl = queueData.response_url;

    if (!requestId) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'No request_id from queue', detail: queueData }) };
    }

    return {
      statusCode: 202,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, statusUrl, responseUrl, prompt }),
    };
  } catch (err) {
    console.error('generateMockup error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal error', detail: err?.message }),
    };
  }
};
