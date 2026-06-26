const Stripe = require('stripe');

/**
 * Verifies a Stripe checkout session_id and returns the artDocId from metadata.
 * Used by the purchase-success page to store a device-scoped unlock token
 * so users (including guests) can immediately edit without watermark.
 *
 * Only returns artDocId — no payment info, no user data.
 */
exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing or invalid session_id' }) };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    // Only unlock if payment is confirmed
    const isPaid =
      session.payment_status === 'paid' ||
      session.status === 'complete';

    if (!isPaid) {
      return {
        statusCode: 402,
        headers,
        body: JSON.stringify({ error: 'Payment not completed' }),
      };
    }

    const artDocId = session.metadata?.artDocId || null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ artDocId, plan: session.metadata?.plan || null }),
    };
  } catch (err) {
    console.error('[verify-checkout-session]', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to verify session' }),
    };
  }
};
