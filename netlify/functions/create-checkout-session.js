const Stripe = require('stripe');

const PRICE_IDS = {
  single: process.env.STRIPE_PRICE_SINGLE,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
};

const SUBSCRIPTION_PLANS = ['monthly', 'yearly'];

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { plan, artDocId, userId, customerEmail, successUrl, cancelUrl } = JSON.parse(event.body);

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Invalid plan: ${plan}` }),
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://makertags.netlify.app';

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: SUBSCRIPTION_PLANS.includes(plan) ? 'subscription' : 'payment',
      success_url: successUrl || `${siteUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${siteUrl}?payment=cancelled`,
      metadata: {
        userId: userId || '',
        artDocId: artDocId || '',
        plan,
        customerEmail: customerEmail || '',
      },
    };

    // Pre-fill email in Stripe checkout form (works for both guest and logged-in)
    if (customerEmail) sessionParams.customer_email = customerEmail;

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error('[create-checkout-session]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
