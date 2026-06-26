const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

async function cloneArtDocToUser(supabase, userId, artDocId) {
  if (!userId || !artDocId) return;

  // Check if already cloned
  const { data: existing } = await supabase
    .from('user_art_docs')
    .select('id')
    .eq('user_id', userId)
    .eq('art_doc_id', artDocId)
    .maybeSingle();

  if (existing) return;

  // Fetch original template
  const { data: artDoc, error: artDocError } = await supabase
    .from('art_docs')
    .select('id')
    .eq('id', artDocId)
    .single();

  if (artDocError || !artDoc) {
    console.error('[stripe-webhook] art_doc not found:', artDocId, artDocError?.message);
    return;
  }

  // Fetch faces separately
  const { data: faces } = await supabase
    .from('art_docs_faces')
    .select('id, side, preview, canvasContent')
    .eq('art_doc_id', artDocId);

  // Create user copy
  const { data: userArtDoc, error: insertError } = await supabase
    .from('user_art_docs')
    .insert([{ user_id: userId, art_doc_id: artDocId }])
    .select('id')
    .single();

  if (insertError) { console.error('[stripe-webhook] clone insert error:', insertError); return; }

  // Copy faces
  const facesToInsert = (faces || []).map(face => ({
    user_art_doc_id: userArtDoc.id,
    side: face.side,
    preview: face.preview,
    canvasContent: face.canvasContent,
  }));

  if (facesToInsert.length > 0) {
    const { error: facesError } = await supabase.from('user_art_docs_faces').insert(facesToInsert);
    if (facesError) console.error('[stripe-webhook] clone faces error:', facesError);
  }

  console.log('[stripe-webhook] Template cloned to user profile:', userId);
}

async function createGuestAccount(supabase, guestEmail) {
  try {
    // Create auth user with OTP (no password)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: guestEmail,
      email_confirm: true, // Auto-confirm email
      user_metadata: { signup_method: 'guest_checkout' },
    });

    if (authError) {
      // If user already exists, just fetch their ID
      if (authError.message?.includes('already exists')) {
        console.log('[stripe-webhook] User already exists:', guestEmail);
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', guestEmail)
          .maybeSingle();
        return profile?.id || null;
      }
      console.error('[stripe-webhook] Failed to create auth user:', authError.message);
      return null;
    }

    const newUserId = authUser.user.id;
    console.log('[stripe-webhook] Created auth account for guest:', guestEmail, '→', newUserId);

    // Create profiles record for the new user
    const { error: profileError } = await supabase.from('profiles').insert({
      id: newUserId,
      email: guestEmail,
      full_name: guestEmail.split('@')[0],
      app_role: 'guest-user',
      has_password: false,
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('[stripe-webhook] Failed to create profile:', profileError.message);
      // Continue anyway — auth user was created
    } else {
      console.log('[stripe-webhook] Created profile for:', guestEmail);
    }

    return newUserId;
  } catch (err) {
    console.error('[stripe-webhook] Error creating guest account:', err.message);
    return null;
  }
}

async function sendPurchaseEmail(supabase, userId, toEmail, siteUrl, plan) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;

    // Create a JWT access token (1 hour validity)
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[stripe-webhook] JWT_SECRET not configured');
      return;
    }

    const accessToken = jwt.sign(
      {
        sub: userId,
        email: toEmail,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        aud: 'authenticated',
        role: 'authenticated',
      },
      jwtSecret,
      { algorithm: 'HS256' }
    );

    // Generate access link with token
    const accessLink = `${siteUrl}/profile?access_token=${encodeURIComponent(accessToken)}`;
    console.log('[stripe-webhook] siteUrl:', siteUrl);
    console.log('[stripe-webhook] Generated access link with JWT for:', toEmail);
    console.log('[stripe-webhook] Full access link:', accessLink);

    const isSubscription = plan === 'monthly' || plan === 'yearly';
    const planLabel = plan === 'yearly' ? 'Pro Yearly' : plan === 'monthly' ? 'Pro Monthly' : null;

    const subject = isSubscription
      ? `🎉 Welcome to ${planLabel} — TagPrintly`
      : '🎉 Your design is unlocked — TagPrintly';

    const headline = isSubscription
      ? `Welcome to ${planLabel}! 🎉`
      : 'Your design is ready! 🎉';

    const bodyText = isSubscription
      ? `Your <strong>${planLabel}</strong> subscription is now active. You have unlimited access to all premium templates on TagPrintly.`
      : 'Your purchase was successful. Your premium template has been added to your profile.';

    const ctaText = isSubscription ? 'Access my designs →' : 'View my profile →';

    const extraNote = isSubscription
      ? `<p style="color:#6b7280;margin:0 0 24px">You can manage or cancel your subscription at any time from your profile.</p>`
      : '';
    // Send email with access link via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'contact@tagprintly.com',
        to: toEmail,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111827">
            <h2 style="margin:0 0 8px">${headline}</h2>
            <p style="color:#6b7280;margin:0 0 24px">
              ${bodyText}
            </p>
            ${extraNote}
            <a href="${accessLink}" style="display:inline-block;background:#f59e0b;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:32px">
              ${ctaText}
            </a>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
            <p style="font-size:13px;color:#6b7280;margin:0">
              Questions? Reply to this email and we'll help.
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendErr = await resendRes.json().catch(() => ({}));
      console.error('[stripe-webhook] Resend error:', JSON.stringify(resendErr));
    } else {
      console.log('[stripe-webhook] Purchase email with direct access link sent to:', toEmail);
    }
  } catch (err) {
    console.error('[stripe-webhook] Error sending purchase email:', err.message);
  }
}

async function handleWebhook(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Netlify may base64-encode the raw body — decode it for Stripe signature verification
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const { userId, artDocId, plan, customerEmail } = session.metadata || {};

    // Skip events without our metadata (e.g. stripe trigger tests)
    if (!plan) {
      console.log('[stripe-webhook] No plan in metadata, skipping.');
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Idempotency check — skip if this session was already processed
    const { data: existing } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existing) {
      console.log('[stripe-webhook] Already processed session:', session.id, '— skipping.');
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Resolve email: from metadata (guest) or from Stripe session
    const email = customerEmail || session.customer_details?.email || '';

    let expiresAt = null;
    if (plan === 'monthly') {
      const d = new Date(); d.setMonth(d.getMonth() + 1);
      expiresAt = d.toISOString();
    } else if (plan === 'yearly') {
      const d = new Date(); d.setFullYear(d.getFullYear() + 1);
      expiresAt = d.toISOString();
    }

    // Resolve userId: if guest, try to find existing account by email; if not found, create one
    let resolvedUserId = userId || null;
    if (!resolvedUserId && email) {
      console.time('[stripe-webhook] profiles lookup');
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      console.timeEnd('[stripe-webhook] profiles lookup');
      if (profile?.id) {
        resolvedUserId = profile.id;
      } else {
        // Create new guest account
        console.time('[stripe-webhook] createGuestAccount');
        const newUserId = await createGuestAccount(supabase, email);
        console.timeEnd('[stripe-webhook] createGuestAccount');
        if (newUserId) resolvedUserId = newUserId;
      }
    }

    const purchaseRow = {
      user_id: resolvedUserId,
      guest_email: email || null,
      art_doc_id: artDocId || null,
      plan,
      stripe_session_id: session.id,
      stripe_subscription_id: session.subscription || null,
      expires_at: expiresAt,
    };

    console.time('[stripe-webhook] user_purchases insert');
    const { error } = await supabase.from('user_purchases').insert(purchaseRow);
    console.timeEnd('[stripe-webhook] user_purchases insert');

    if (error) {
      console.error('[stripe-webhook] Supabase insert error:', JSON.stringify(error));
      // Unique constraint violation = already processed (race condition between retries)
      if (error.code === '23505') {
        console.log('[stripe-webhook] Duplicate session detected (unique constraint), skipping:', session.id);
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
      }
      // If guest_email column does not exist yet, retry without it but keep stripe_subscription_id
      if (error.message?.includes('guest_email') || error.code === '42703') {
        const { error: retryError } = await supabase.from('user_purchases').insert({
          user_id: resolvedUserId,
          art_doc_id: artDocId || null,
          plan,
          stripe_session_id: session.id,
          stripe_subscription_id: session.subscription || null,
          expires_at: expiresAt,
        });
        if (retryError) {
          console.error('[stripe-webhook] Retry insert error:', JSON.stringify(retryError));
          return { statusCode: 500, body: 'Database error' };
        }
      } else {
        return { statusCode: 500, body: 'Database error' };
      }
    }

    // Derive site URL from the request host header (works for both branch deploys and production).
    // Stripe calls the exact webhook URL configured in its dashboard, so host = the real frontend domain.
    // Fall back to SITE_URL env var, then to localhost for local dev.
    const requestHost = event.headers['x-forwarded-host'] || event.headers['host'] || '';
    const siteUrl = (
      (requestHost && !requestHost.includes('localhost') && !requestHost.includes('127.0.0.1'))
        ? `https://${requestHost}`
        : (process.env.SITE_URL || `http://${requestHost || 'localhost:4200'}`)
    ).replace(/\/$/, '');
    console.log('[stripe-webhook] siteUrl:', siteUrl, '| host:', requestHost, '| SITE_URL:', process.env.SITE_URL);

    console.log('[stripe-webhook] metadata:', { userId, artDocId, plan, customerEmail });
    console.log('[stripe-webhook] resolvedUserId:', resolvedUserId, '| email:', email);

    // Clone template to user profile if user is known
    if (resolvedUserId && artDocId) {
      console.log('[stripe-webhook] Cloning artDoc', artDocId, 'to user', resolvedUserId);
      console.time('[stripe-webhook] cloneArtDoc');
      await cloneArtDocToUser(supabase, resolvedUserId, artDocId);
      console.timeEnd('[stripe-webhook] cloneArtDoc');
    } else {
      console.log('[stripe-webhook] Skip clone — resolvedUserId:', resolvedUserId, 'artDocId:', artDocId);
    }

    // Send email to all buyers (guest and authenticated) with magic link
    if (email) {
      try {
        console.time('[stripe-webhook] sendPurchaseEmail');
        await sendPurchaseEmail(supabase, resolvedUserId, email, siteUrl, plan);
        console.timeEnd('[stripe-webhook] sendPurchaseEmail');
      } catch (mailErr) {
        console.error('[stripe-webhook] Email error:', mailErr.message);
      }
    }

    console.log(`[stripe-webhook] Purchase recorded — user: ${resolvedUserId || 'guest'}, email: ${email}, plan: ${plan}`);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ received: true }),
  };
}

exports.handler = async function (event) {
  const TIMEOUT_MS = 25_000;
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(
      () => resolve({ statusCode: 504, body: JSON.stringify({ error: 'Function timeout' }) }),
      TIMEOUT_MS
    )
  );
  return Promise.race([handleWebhook(event), timeoutPromise]);
};
