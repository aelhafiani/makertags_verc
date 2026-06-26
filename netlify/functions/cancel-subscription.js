const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify caller identity via their JWT
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { purchaseId, cancel } = body;
  if (!purchaseId || typeof cancel !== 'boolean') {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing purchaseId or cancel flag' }) };
  }

  // Step 1: verify ownership (without stripe_subscription_id in case column doesn't exist yet)
  const { data: ownership, error: ownerError } = await supabase
    .from('user_purchases')
    .select('id, user_id')
    .eq('id', purchaseId)
    .maybeSingle();

  if (ownerError) {
    console.error('[cancel-subscription] Ownership query error:', ownerError);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: ownerError.message }) };
  }

  if (!ownership) {
    return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Purchase not found' }) };
  }

  if (ownership.user_id !== user.id) {
    return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Step 2: try to get stripe_subscription_id (column may not exist on older schemas)
  let stripeSubscriptionId = null;
  const { data: subData, error: subError } = await supabase
    .from('user_purchases')
    .select('stripe_subscription_id')
    .eq('id', purchaseId)
    .maybeSingle();

  if (!subError && subData) {
    stripeSubscriptionId = subData.stripe_subscription_id || null;
  } else if (subError) {
    console.warn('[cancel-subscription] stripe_subscription_id column may not exist yet:', subError.message);
  }

  if (!stripeSubscriptionId) {
    // Subscription created before stripe_subscription_id was stored
    if (!cancel) {
      // Reactivation impossible — no Stripe reference, subscription may have been deleted
      console.warn('[cancel-subscription] Reactivation requested but no stripe_subscription_id for purchase', purchaseId);
      return { statusCode: 410, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'subscription_deleted', resubscribeRequired: true }) };
    }
    // Cancel: skip Stripe, let caller update Supabase only
    console.log('[cancel-subscription] No stripe_subscription_id for purchase', purchaseId, '— skipping Stripe for cancel');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, stripeSkipped: true }) };
  }

  const purchase = { stripe_subscription_id: stripeSubscriptionId };

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    await stripe.subscriptions.update(purchase.stripe_subscription_id, {
      cancel_at_period_end: cancel,
    });
    console.log('[cancel-subscription] Stripe subscription', purchase.stripe_subscription_id, 'cancel_at_period_end =', cancel);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    // Subscription was deleted on Stripe (immediate cancellation from dashboard)
    if (err.code === 'resource_missing') {
      console.warn('[cancel-subscription] Stripe subscription no longer exists:', purchase.stripe_subscription_id);
      return { statusCode: 410, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'subscription_deleted', resubscribeRequired: true }) };
    }
    console.error('[cancel-subscription] Stripe error:', err.message);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
  }
};
