const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// siteUrl is derived from the request host at call time (see getSiteUrl helper below)

/**
 * Derive the site URL from the incoming request headers.
 * Works in every environment without any env var:
 *   - prod:  host = tagprintly.com  → https://tagprintly.com
 *   - local: host = localhost:8888  → http://localhost:8888
 */
function getSiteUrl(event) {
  const host = event.headers['x-forwarded-host'] || event.headers['host'] || '';
  // When called from a local browser (localhost), use SITE_URL env var as override
  // so emails point to the correct deployed URL even during local dev.
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return (process.env.SITE_URL || `http://${host}`).replace(/\/$/, '');
  }
  return `https://${host}`.replace(/\/$/, '');
}

/**
 * POST /.netlify/functions/admin-resend-email
 * Body: { userId: string|null, email: string, purchaseId: string }
 * Header: Authorization: Bearer <supabase-session-jwt>
 *
 * The caller must be authenticated as an admin (app_role = 'admin' in profiles).
 */
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── 1. Verify admin identity ──────────────────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!callerToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing authorization token' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify the caller's JWT and get their user ID
  const { data: callerData, error: callerError } = await supabase.auth.getUser(callerToken);
  if (callerError || !callerData?.user?.id) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // Check that the caller is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', callerData.user.id)
    .maybeSingle();

  if (profile?.app_role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: admin only' }) };
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { userId, email, purchaseId } = body;

  if (!email || !purchaseId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email and purchaseId are required' }) };
  }

  // ── 3. Verify purchase exists ─────────────────────────────────────────────
  const { data: purchase, error: purchaseError } = await supabase
    .from('user_purchases')
    .select('id, user_id, plan')
    .eq('id', purchaseId)
    .maybeSingle();

  if (purchaseError || !purchase) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Purchase not found' }) };
  }

  // ── 4. Send the email ─────────────────────────────────────────────────────
  const resolvedUserId = userId || purchase.user_id;
  const siteUrl = getSiteUrl(event);
  console.log('[admin-resend-email] siteUrl (from request host):', siteUrl);
  await sendPurchaseEmail(resolvedUserId, email, siteUrl);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, message: `Email sent to ${email}` }),
  };
};

async function sendPurchaseEmail(userId, toEmail, siteUrl) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error('RESEND_API_KEY not configured');

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not configured');

  const accessToken = jwt.sign(
    {
      sub: userId,
      email: toEmail,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      aud: 'authenticated',
      role: 'authenticated',
    },
    jwtSecret,
    { algorithm: 'HS256' }
  );

  const accessLink = `${siteUrl}/profile?access_token=${encodeURIComponent(accessToken)}`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'contact@tagprintly.com',
      to: toEmail,
      subject: '🎉 Your design is unlocked — TagPrintly',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111827">
          <h2 style="margin:0 0 8px">Your design is ready! 🎉</h2>
          <p style="color:#6b7280;margin:0 0 24px">
            Your purchase was successful. Your premium template has been added to your profile.
          </p>
          <p style="color:#6b7280;margin:0 0 24px">
            Click the button below to access your design instantly — no login required.
          </p>
          <a href="${accessLink}" style="display:inline-block;background:#f59e0b;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:32px">
            View my profile →
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
    const err = await resendRes.json().catch(() => ({}));
    throw new Error('Resend error: ' + JSON.stringify(err));
  }
}
