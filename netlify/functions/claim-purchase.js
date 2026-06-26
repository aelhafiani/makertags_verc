const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

/**
 * Idempotent endpoint: verifies a Stripe session, identifies the current user
 * via their Supabase JWT, and clones the purchased art doc to their profile.
 *
 * This is a reliable fallback in case the stripe-webhook missed, was delayed,
 * or was called for a guest whose account didn't exist yet at webhook time.
 *
 * POST body: { sessionId: string }
 * Header: Authorization: Bearer <supabase_access_token>
 */
exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // ── 1. Parse body ────────────────────────────────────────────────────────
  let sessionId;
  try {
    ({ sessionId } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing or invalid sessionId' }) };
  }

  // ── 2. Identify user from Supabase JWT ────────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!userToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing auth token' }) };
  }

  // Use service-role client so we can work with RLS-exempt operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify the JWT and get the user
  const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);
  if (userError || !user?.id) {
    console.error('[claim-purchase] Invalid token:', userError?.message);
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired auth token' }) };
  }
  const userId = user.id;

  // ── 3. Verify Stripe session is paid ────────────────────────────────────
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  let stripeSession;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error('[claim-purchase] Stripe retrieve error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to retrieve Stripe session' }) };
  }

  const isPaid =
    stripeSession.payment_status === 'paid' ||
    stripeSession.status === 'complete';

  if (!isPaid) {
    return { statusCode: 402, headers, body: JSON.stringify({ error: 'Payment not completed' }) };
  }

  const artDocId = stripeSession.metadata?.artDocId || null;
  const plan = stripeSession.metadata?.plan || 'single';

  // ── 4. Upsert purchase record (idempotent) ────────────────────────────────
  const { data: existingPurchase } = await supabase
    .from('user_purchases')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (!existingPurchase) {
    let expiresAt = null;
    if (plan === 'monthly') {
      const d = new Date(); d.setMonth(d.getMonth() + 1);
      expiresAt = d.toISOString();
    } else if (plan === 'yearly') {
      const d = new Date(); d.setFullYear(d.getFullYear() + 1);
      expiresAt = d.toISOString();
    }

    const purchaseRow = {
      user_id: userId,
      art_doc_id: artDocId || null,
      plan,
      stripe_session_id: sessionId,
      expires_at: expiresAt,
    };

    const { error: purchaseError } = await supabase
      .from('user_purchases')
      .insert(purchaseRow);

    if (purchaseError && purchaseError.code !== '23505') {
      // 23505 = unique constraint (already inserted) — safe to ignore
      console.error('[claim-purchase] purchase insert error:', purchaseError.message);
    }
  }

  // ── 5. Clone art doc to user profile (idempotent) ─────────────────────────
  if (artDocId) {
    await cloneArtDocToUser(supabase, userId, artDocId);
  }

  console.log(`[claim-purchase] Done — user: ${userId}, artDocId: ${artDocId}, plan: ${plan}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, artDocId }),
  };
};

async function cloneArtDocToUser(supabase, userId, artDocId) {
  // Idempotency: skip if already cloned for this original art_doc_id
  const { data: existing } = await supabase
    .from('user_art_docs')
    .select('id')
    .eq('user_id', userId)
    .eq('art_doc_id', artDocId)
    .maybeSingle();

  if (existing) {
    console.log('[claim-purchase] Art doc already cloned:', artDocId, '→ user:', userId);
    return;
  }

  // Fetch original template
  const { data: artDoc, error: artDocError } = await supabase
    .from('art_docs')
    .select('id')
    .eq('id', artDocId)
    .single();

  if (artDocError || !artDoc) {
    console.error('[claim-purchase] art_doc not found:', artDocId, artDocError?.message);
    return;
  }

  // Fetch faces
  const { data: faces } = await supabase
    .from('art_docs_faces')
    .select('id, side, preview, canvasContent')
    .eq('art_doc_id', artDocId);

  // Insert user copy
  const { data: userArtDoc, error: insertError } = await supabase
    .from('user_art_docs')
    .insert([{ user_id: userId, art_doc_id: artDocId }])
    .select('id')
    .single();

  if (insertError) {
    console.error('[claim-purchase] clone insert error:', insertError.message);
    return;
  }

  // Copy faces
  const facesToInsert = (faces || []).map(face => ({
    user_art_doc_id: userArtDoc.id,
    side: face.side,
    preview: face.preview,
    canvasContent: face.canvasContent,
  }));

  if (facesToInsert.length > 0) {
    const { error: facesError } = await supabase
      .from('user_art_docs_faces')
      .insert(facesToInsert);
    if (facesError) console.error('[claim-purchase] clone faces error:', facesError.message);
  }

  console.log('[claim-purchase] Art doc cloned to user profile:', userId, '← artDocId:', artDocId);
}
