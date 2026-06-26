const FAL_API_KEY = process.env.FAL_API_KEY || '4ba42982-2aca-430b-a72f-5739c44ec0d7:6588bc1f6aaa9ae97dc25b67561fedfb';

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const statusUrl = event.queryStringParameters?.statusUrl;
  const responseUrl = event.queryStringParameters?.responseUrl;
  if (!statusUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing statusUrl parameter' }) };
  }

  try {
    const res = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Status check failed', detail: err }) };
    }

    const data = await res.json();
    // data.status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    // data.output.images[0].url when COMPLETED

    if (data.status === 'COMPLETED') {
      // Fetch actual output from response_url (fal.ai queue pattern)
      let imageUrl = data.output?.images?.[0]?.url ?? null;
      if (!imageUrl) {
        const outUrl = responseUrl ?? statusUrl.replace('/status', '');
        try {
          const outRes = await fetch(outUrl, {
            headers: { 'Authorization': `Key ${FAL_API_KEY}` },
          });
          const outData = await outRes.json();
          imageUrl = outData?.images?.[0]?.url ?? outData?.output?.images?.[0]?.url ?? null;
        } catch (e) {
          console.warn('pollMockup: could not fetch response_url', e);
        }
      }
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', imageUrl }),
      };
    }

    if (data.status === 'FAILED') {
      return {
        statusCode: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FAILED', error: data.error ?? 'Generation failed' }),
      };
    }

    // IN_QUEUE or IN_PROGRESS
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: data.status }),
    };
  } catch (err) {
    console.error('pollMockup error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal error', detail: err?.message }),
    };
  }
};
