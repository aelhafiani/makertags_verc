const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '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';
const FAL_API_KEY = process.env.FAL_API_KEY || '4ba42982-2aca-430b-a72f-5739c44ec0d7:6588bc1f6aaa9ae97dc25b67561fedfb';

const ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages';
const FAL_RECRAFT    = 'https://fal.run/fal-ai/recraft-v3';

const ALLOWED_ORIGINS = new Set([
  'https://tagprintly.com',
  'https://makertags.netlify.app',
  'http://localhost:4200',
]);

export const handler = async (event) => {
  const origin = event.headers?.origin ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://tagprintly.com';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const {
      imageBase64,
      canvasWidth  = 400,
      canvasHeight = 600,
      shapeModelName = null,
    } = JSON.parse(event.body || '{}');

    if (!imageBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'imageBase64 required' }) };
    }

    const base64Data      = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mediaTypeMatch  = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mediaType       = mediaTypeMatch?.[1] ?? 'image/jpeg';
    const centerX         = Math.round(canvasWidth / 2);

    const shapeContext = shapeModelName
      ? `The tag shape "${shapeModelName}" is already placed on the canvas as a locked background layer. Do NOT generate any shape for the tag outline. Generate ONLY the content that goes INSIDE the tag.`
      : `No specific shape model. Generate a complete design including a subtle background.`;

    // ── STEP 1: Claude analyses the inspiration image ─────────────────────
    const systemPrompt = `You are a graphic design expert and Fabric.js specialist. Analyze the inspiration image and output a single JSON object describing the design to reproduce.

CANVAS SIZE: ${canvasWidth}x${canvasHeight}px
${shapeContext}

OUTPUT: Return ONLY raw JSON — no markdown, no code fences, no explanation.

JSON SCHEMA:
{
  "background": "#hexcolor",
  "illustration": {
    "prompt": "detailed fal.ai image generation prompt for the decorative illustration visible in the design (botanical, floral, geometric, etc.) — must request transparent or white background, isolated element, no text",
    "style": "digital_illustration",
    "left": <number — left edge position in px>,
    "top": <number — top edge position in px>,
    "width": <number — desired display width in px>,
    "height": <number — desired display height in px>
  },
  "objects": [
    // Fabric.js objects — text, decorative paths, lines, shapes ONLY
    // See type definitions below
  ]
}

Set "illustration" to null if the inspiration image has NO decorative illustration (only text).

FABRIC.JS OBJECT TYPES:

i-text (for all text):
{ "type": "i-text", "left": ${centerX}, "top": 0, "originX": "center", "originY": "top", "text": "…", "fontSize": 28, "fontFamily": "Dancing Script", "fill": "#333", "fontWeight": "normal", "fontStyle": "normal", "textAlign": "center", "charSpacing": 50, "lineHeight": 1.2, "angle": 0, "opacity": 1, "selectable": true }

rect:
{ "type": "rect", "left": 0, "top": 0, "width": 200, "height": 4, "fill": "#hex", "stroke": null, "strokeWidth": 0, "rx": 2, "ry": 2, "opacity": 1, "selectable": true }

line (divider):
{ "type": "line", "x1": 0, "y1": 0, "x2": 200, "y2": 0, "left": ${centerX}, "top": 0, "originX": "center", "stroke": "#hex", "strokeWidth": 1, "opacity": 0.5, "selectable": true }

path (ornamental shapes — leaf, petal, swirl, border):
{ "type": "path", "left": 0, "top": 0, "path": "M …", "fill": "#hex", "stroke": null, "strokeWidth": 0, "scaleX": 1, "scaleY": 1, "opacity": 1, "selectable": true }

DESIGN RULES:
1. Extract the exact color palette from the image
2. Reproduce ALL visible text content with matching style, weight, letter-spacing and approximate position
3. Center all text: use left = ${centerX} with originX "center"
4. Position elements proportionally within ${canvasWidth}x${canvasHeight}
5. The illustration (flowers, leaves, botanical art, etc.) goes in the "illustration" field — NOT as an object
6. DO NOT generate a hole, circular punch or any tag outline shape
7. Generate 4 to 14 objects (text + decorative only)`;

    const claudeRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: 'Analyze this design and return the JSON. Return only the JSON object.' },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error('Claude error:', err);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Claude failed', detail: err }) };
    }

    const claudeData = await claudeRes.json();
    const rawContent = claudeData.content?.[0]?.text ?? '';

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in Claude response:', rawContent);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'No JSON from Claude' }) };
    }

    let designSpec;
    try {
      designSpec = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON parse error:', e);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Invalid JSON from Claude' }) };
    }

    // ── STEP 2: Generate illustration with fal.ai recraft-v3 ─────────────
    const illus = designSpec.illustration;
    if (illus?.prompt) {
      try {
        const falRes = await fetch(FAL_RECRAFT, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: illus.prompt,
            style: illus.style ?? 'digital_illustration',
            image_size: { width: 1024, height: 512 },
            colors: [],
          }),
        });

        if (falRes.ok) {
          const falData = await falRes.json();
          const imageUrl = falData?.images?.[0]?.url ?? null;

          if (imageUrl) {
            // Inject as a Fabric.js image object, placed AFTER shape but BEFORE texts
            const imgObj = {
              type: 'image',
              src: imageUrl,
              left: illus.left ?? centerX,
              top: illus.top ?? 0,
              originX: 'center',
              originY: 'top',
              scaleX: (illus.width ?? canvasWidth) / 1024,
              scaleY: (illus.height ?? Math.round(canvasHeight * 0.3)) / 512,
              selectable: true,
              crossOrigin: 'anonymous',
            };

            // Insert illustration at the beginning so it renders below text
            designSpec.objects = [imgObj, ...(designSpec.objects ?? [])];
          }
        } else {
          console.warn('fal.ai recraft failed:', await falRes.text());
        }
      } catch (falErr) {
        // Non-blocking — design still works without the illustration
        console.warn('fal.ai illustration generation failed:', falErr?.message);
      }
    }

    // ── STEP 3: Build final Fabric JSON ───────────────────────────────────
    const fabricJson = {
      version: '6.0.0',
      background: designSpec.background ?? '#ffffff',
      objects: designSpec.objects ?? [],
    };

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fabricJson }),
    };

  } catch (err) {
    console.error('generateDesignFromInspiration error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal error', detail: err?.message }),
    };
  }
};
